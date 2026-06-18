import type { UploadFile } from '../components/Uploader/types'
import { supabase } from '../utils/supabase'
import { ensure_dataset_drive_folder } from '../utils/google_drive'

export type UploadProgressCallback = (progress: number, loaded: number, total: number) => void
export type UploadCompleteCallback = () => void
export type UploadErrorCallback = (error: string) => void

export interface UploadCallbacks {
	on_progress: UploadProgressCallback
	on_complete: UploadCompleteCallback
	on_error: UploadErrorCallback
}

export interface DriveUploadResult {
	drive_file_id: string
	file_name: string
	file_size: number
	mime_type: string
}

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

async function save_image_metadata(
	dataset_id: string,
	file_name: string,
	drive_file_id: string,
	file_size: number
): Promise<void> {
	const drive_url = `https://lh3.googleusercontent.com/d/${drive_file_id}`
	const { error: db_err } = await supabase.from('dataset_images').insert({
		dataset_id,
		file_name,
		file_url: drive_url,
		width: 0,
		height: 0,
		file_size_bytes: file_size,
		class_labels: [],
		file_extension: file_name.split('.').pop() ?? ''
	})
	if (db_err) {
		console.error('Failed to save image metadata:', db_err)
		return
	}
	const { data: ds } = await supabase
		.from('datasets')
		.select('image_count')
		.eq('id', dataset_id)
		.single()
	if (ds) {
		await supabase
			.from('datasets')
			.update({ image_count: (ds.image_count ?? 0) + 1 })
			.eq('id', dataset_id)
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

async function ensure_upload_folder(
	access_token: string,
	dataset_id: string,
	project_id: string | undefined
): Promise<string> {
	const dataset = await get_dataset_drive_info(dataset_id)
	const resolved_project_id = project_id ?? dataset.project_id
	const project = await get_project_drive_info(resolved_project_id)

	const ensured = await ensure_dataset_drive_folder({
		access_token,
		project_id: resolved_project_id,
		project_name: project.name,
		dataset_id: dataset.id,
		dataset_name: dataset.name,
		existing_project_folder_id: project.drive_folder_id,
		existing_dataset_folder_id: dataset.drive_folder_id
	})

	if (!project.drive_folder_id) {
		await supabase
			.from('projects')
			.update({ drive_folder_id: ensured.project_folder_id })
			.eq('id', resolved_project_id)
	}

	if (!dataset.drive_folder_id) {
		await supabase
			.from('datasets')
			.update({ drive_folder_id: ensured.dataset_folder_id })
			.eq('id', dataset.id)
	}

	return ensured.dataset_folder_id
}

async function start_resumable_session(
	access_token: string,
	file_name: string,
	mime_type: string,
	parent_folder_id: string
): Promise<string> {
	const resp = await fetch(
		'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${access_token}`,
				'Content-Type': 'application/json; charset=UTF-8',
				'X-Upload-Content-Type': mime_type
			},
			body: JSON.stringify({
				name: file_name,
				parents: [parent_folder_id]
			})
		}
	)

	if (!resp.ok) {
		let message = `Failed to create upload session (${resp.status})`
		try {
			const err = await resp.json()
			message = err.error?.message ?? message
		} catch {
			/* ignore */
		}
		throw new Error(message)
	}

	const location = resp.headers.get('Location')
	if (!location) {
		throw new Error('No upload session URL returned')
	}

	return location
}

async function upload_file_to_drive(
	file: UploadFile,
	access_token: string,
	parent_folder_id: string,
	controller: AbortController,
	callbacks: UploadCallbacks
): Promise<DriveUploadResult> {
	const session_url = await start_resumable_session(
		access_token,
		file.name,
		file.file.type || 'application/octet-stream',
		parent_folder_id
	)

	const xhr = new XMLHttpRequest()
	controller.signal.addEventListener('abort', () => xhr.abort())

	return new Promise<DriveUploadResult>((resolve, reject) => {
		xhr.upload.addEventListener('progress', (e) => {
			if (e.lengthComputable) {
				const progress = Math.round((e.loaded / e.total) * 100)
				callbacks.on_progress(progress, e.loaded, e.total)
			}
		})

		xhr.addEventListener('load', () => {
			if (xhr.status === 200 || xhr.status === 201) {
				let drive_file_id = ''
				let file_name = ''
				try {
					const response = JSON.parse(xhr.responseText)
					drive_file_id = response.id ?? ''
					file_name = response.name ?? ''
				} catch {
					/* malformed JSON fallback */
				}
				resolve({
					drive_file_id: drive_file_id || xhr.responseText.slice(0, 64),
					file_name: file_name || file.name,
					file_size: file.size,
					mime_type: file.file.type
				})
			} else {
				let message = `Google Drive upload failed (${xhr.status})`
				try {
					const err = JSON.parse(xhr.responseText)
					message = err.error?.message ?? message
				} catch {
					/* ignore parse error */
				}
				reject(new Error(message))
			}
		})

		xhr.addEventListener('error', () => {
			reject(new Error('Network error during Google Drive upload'))
		})

		xhr.addEventListener('abort', () => {
			reject(new DOMException('Aborted', 'AbortError'))
		})

		xhr.open('PUT', session_url)
		xhr.setRequestHeader('Content-Type', file.file.type || 'application/octet-stream')
		xhr.send(file.file)
	})
}

export async function upload_to_drive_and_save(
	file: UploadFile,
	access_token: string,
	dataset_id: string | undefined,
	_project_id: string | undefined,
	callbacks: UploadCallbacks
): Promise<void> {
	const controller = new AbortController()
	active_uploads.set(file.id, controller)

	try {
		let parent_folder_id: string | undefined

		if (dataset_id) {
			parent_folder_id = await ensure_upload_folder(access_token, dataset_id, _project_id)
		}

		if (!parent_folder_id) {
			throw new Error('No dataset folder available for Google Drive upload')
		}

		const result = await upload_file_to_drive(
			file,
			access_token,
			parent_folder_id,
			controller,
			callbacks
		)

		if (dataset_id) {
			await save_image_metadata(
				dataset_id,
				result.file_name,
				result.drive_file_id,
				result.file_size
			)
		}

		callbacks.on_complete()
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') return
		const message = err instanceof Error ? err.message : 'Upload failed unexpectedly'
		callbacks.on_error(message)
	} finally {
		active_uploads.delete(file.id)
	}
}

async function simulate_chunk_upload(
	controller: AbortController,
	file: UploadFile,
	callbacks: UploadCallbacks
): Promise<void> {
	const total_chunks = 20
	for (let chunk = 0; chunk < total_chunks; chunk++) {
		if (controller.signal.aborted) return

		const progress = Math.min(100, ((chunk + 1) / total_chunks) * 100)

		if (progress > 40 && progress < 60 && Math.random() < 0.05) {
			throw new Error('Network timeout during chunk sequence.')
		}

		await new Promise<void>((resolve) => setTimeout(resolve, 500 + Math.random() * 300))

		if (controller.signal.aborted) return

		const loaded = Math.floor((progress / 100) * file.size)
		callbacks.on_progress(progress, loaded, file.size)
	}
	callbacks.on_complete()
}

export async function upload_file(
	file: UploadFile,
	_dataset_id: string,
	callbacks: UploadCallbacks
): Promise<void> {
	const controller = new AbortController()
	active_uploads.set(file.id, controller)

	try {
		await simulate_chunk_upload(controller, file, callbacks)
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') return
		const message = err instanceof Error ? err.message : 'Upload failed unexpectedly'
		callbacks.on_error(message)
	} finally {
		active_uploads.delete(file.id)
	}
}
