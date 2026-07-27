import type { UploadFile } from '../components/Uploader/types'
import { supabase } from '../utils/supabase'

export type UploadProgressCallback = (progress: number, loaded: number, total: number) => void
export type UploadCompleteCallback = () => void
export type UploadErrorCallback = (error: string) => void

export interface UploadCallbacks {
	on_progress: UploadProgressCallback
	on_complete: UploadCompleteCallback
	on_error: UploadErrorCallback
}

const STORAGE_BUCKET = 'dataset-images'

const active_uploads = new Map<string, AbortController>()

export function cancel_upload(file_id: string): void {
	const controller = active_uploads.get(file_id)
	if (controller) {
		controller.abort()
		active_uploads.delete(file_id)
	}
}

export function cancel_all_uploads(file_ids: string[]): void {
	for (const id of file_ids) {
		cancel_upload(id)
	}
}

async function upload_to_supabase_storage(
	file: File,
	dataset_id: string,
	file_name: string,
	on_progress: UploadProgressCallback,
	signal?: AbortSignal
): Promise<string> {
	if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

	const unique_name = `${crypto.randomUUID()}-${file_name}`
	const file_path = `${dataset_id}/${unique_name}`

	const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(file_path, file, {
		cacheControl: '3600',
		upsert: false,
		contentType: file.type || 'application/octet-stream'
	})

	if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

	if (error) {
		throw new Error(`Supabase Storage upload failed: ${error.message}`)
	}

	const {
		data: { publicUrl: public_url }
	} = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path)

	on_progress(100, file.size, file.size)
	return public_url
}

async function save_image_metadata(
	dataset_id: string,
	file_name: string,
	file_url: string,
	file_size: number
): Promise<void> {
	const { error: db_err } = await supabase.from('dataset_images').insert({
		dataset_id,
		file_name,
		file_url,
		width: 0,
		height: 0,
		file_size_bytes: file_size,
		class_labels: [],
		file_extension: file_name.split('.').pop() ?? ''
	})
	if (db_err) {
		throw new Error(`Failed to save image metadata: ${db_err.message}`)
	}

	const { error: rpc_err } = await supabase.rpc('increment_dataset_counts', {
		p_dataset_id: dataset_id,
		p_file_size: file_size
	})
	if (rpc_err) {
		throw new Error(`Failed to increment dataset counts: ${rpc_err.message}`)
	}
}

interface ProjectDriveInfo {
	id: string
	name: string
	drive_folder_id?: string
}

interface DatasetDriveInfo {
	id: string
	project_id: string
	name: string
	drive_folder_id?: string
}

function get_api_base(): string {
	return import.meta.env.VITE_API_BASE_URL ?? '/api'
}

async function get_project_drive_info(project_id: string): Promise<ProjectDriveInfo> {
	const { data, error } = await supabase
		.from('projects')
		.select('id, name, drive_folder_id')
		.eq('id', project_id)
		.single()

	if (error || !data) {
		throw new Error(error?.message ?? 'Failed to load project drive info')
	}

	return data as ProjectDriveInfo
}

async function get_dataset_drive_info(dataset_id: string): Promise<DatasetDriveInfo> {
	const { data, error } = await supabase
		.from('datasets')
		.select('id, project_id, name, drive_folder_id')
		.eq('id', dataset_id)
		.single()

	if (error || !data) {
		throw new Error(error?.message ?? 'Failed to load dataset drive info')
	}

	return data as DatasetDriveInfo
}

async function fetch_upload_names(
	dataset_id: string | undefined,
	_project_id: string | undefined
): Promise<{ project_name: string; dataset_name: string; resolved_project_id: string }> {
	if (!dataset_id) {
		return { project_name: '', dataset_name: '', resolved_project_id: _project_id ?? '' }
	}
	let project_name = ''
	let dataset_name = ''
	let resolved_project_id = _project_id ?? ''
	try {
		const dataset_info = await get_dataset_drive_info(dataset_id)
		dataset_name = dataset_info.name
		resolved_project_id = dataset_info.project_id
		const project_info = await get_project_drive_info(resolved_project_id)
		project_name = project_info.name
	} catch {
		// Backend will upload without folder hierarchy
	}
	return { project_name, dataset_name, resolved_project_id }
}

async function update_image_url(
	dataset_id: string,
	file_name: string,
	file_url: string
): Promise<void> {
	const { error } = await supabase
		.from('dataset_images')
		.update({ file_url })
		.eq('dataset_id', dataset_id)
		.eq('file_name', file_name)
	if (error) {
		throw new Error(`Failed to update image URL: ${error.message}`)
	}
}

async function poll_drive_upload(
	cache_url: string,
	dataset_id: string,
	file_name: string,
	signal: AbortSignal
): Promise<void> {
	const api_base = get_api_base()
	const max_attempts = 300 // 10 minutes at 2s intervals
	const poll_interval = 2000

	for (let attempt = 0; attempt < max_attempts; attempt++) {
		if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

		await new Promise((resolve) => setTimeout(resolve, poll_interval))
		if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

		let response: Response
		try {
			response = await fetch(
				`${api_base}/upload/drive/status?cache_url=${encodeURIComponent(cache_url)}`,
				{ signal }
			)
		} catch {
			continue
		}

		if (!response.ok) continue

		const data = await response.json()
		if (data.status === 'completed' && data.file_url) {
			await update_image_url(dataset_id, file_name, data.file_url)
			window.dispatchEvent(new CustomEvent('datasets-changed'))
			return
		}

		if (data.status === 'failed') {
			throw new Error('Drive upload failed on the server')
		}
	}

	throw new Error('Drive upload timed out')
}

export async function upload_to_drive_and_save(
	file: UploadFile,
	_access_token: string,
	dataset_id: string | undefined,
	_project_id: string | undefined,
	callbacks: UploadCallbacks
): Promise<void> {
	const controller = new AbortController()
	active_uploads.set(file.id, controller)

	try {
		const { project_name, dataset_name } = await fetch_upload_names(dataset_id, _project_id)
		const api_base = get_api_base()

		const {
			data: { user }
		} = await supabase.auth.getUser()
		const user_id = user?.id ?? ''
		const params = new URLSearchParams({ file_name: file.name })
		if (project_name) params.set('project_name', project_name)
		if (dataset_name) params.set('dataset_name', dataset_name)
		if (user_id) params.set('user_id', user_id)
		if (dataset_id) params.set('dataset_id', dataset_id)

		const xhr = new XMLHttpRequest()
		controller.signal.addEventListener('abort', () => xhr.abort())

		const cache_url = await new Promise<string>((resolve, reject) => {
			xhr.upload.addEventListener('progress', (e) => {
				if (e.lengthComputable) {
					const pct = Math.round((e.loaded / e.total) * 100)
					callbacks.on_progress(pct, e.loaded, e.total)
				}
			})
			xhr.addEventListener('load', function () {
				if (this.status === 200 || this.status === 201) {
					try {
						const response = JSON.parse(this.responseText)
						resolve(response.file_url ?? '')
					} catch {
						reject(new Error('Invalid response from server'))
					}
				} else {
					let message = `Upload failed (${this.status})`
					try {
						const err = JSON.parse(this.responseText)
						message = err.detail ?? message
					} catch {
						/* ignore */
					}
					reject(new Error(message))
				}
			})
			xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
			xhr.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
			xhr.open('POST', `${api_base}/upload/drive?${params}`)
			xhr.setRequestHeader('Content-Type', file.file.type || 'application/octet-stream')
			xhr.send(file.file)
		})

		if (dataset_id) {
			await save_image_metadata(dataset_id, file.name, cache_url, file.size)
		}

		callbacks.on_complete()

		if (dataset_id) {
			poll_drive_upload(cache_url, dataset_id, file.name, new AbortController().signal).catch(
				() => {}
			)
		}
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') return
		const message = err instanceof Error ? err.message : 'Upload failed unexpectedly'
		callbacks.on_error(message)
	} finally {
		active_uploads.delete(file.id)
	}
}

export async function upload_file(
	file: UploadFile,
	dataset_id: string,
	callbacks: UploadCallbacks
): Promise<void> {
	const controller = new AbortController()
	active_uploads.set(file.id, controller)

	try {
		const file_url = await upload_to_supabase_storage(
			file.file,
			dataset_id,
			file.name,
			callbacks.on_progress,
			controller.signal
		)
		await save_image_metadata(dataset_id, file.name, file_url, file.size)
		callbacks.on_complete()
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') return
		const message = err instanceof Error ? err.message : 'Upload failed unexpectedly'
		callbacks.on_error(message)
	} finally {
		active_uploads.delete(file.id)
	}
}
