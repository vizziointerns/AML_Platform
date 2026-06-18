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

export interface DriveUploadResult {
	drive_file_id: string
	file_name: string
	file_size: number
	mime_type: string
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

async function make_file_public(file_id: string, access_token: string): Promise<void> {
	await fetch(`https://www.googleapis.com/drive/v3/files/${file_id}/permissions`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${access_token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ type: 'anyone', role: 'reader' })
	})
}

async function upload_to_supabase_storage(
	file: File,
	dataset_id: string,
	file_name: string,
	on_progress: UploadProgressCallback
): Promise<string> {
	const unique_name = `${crypto.randomUUID()}-${file_name}`
	const file_path = `${dataset_id}/${unique_name}`

	const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(file_path, file, {
		cacheControl: '3600',
		upsert: false,
		contentType: file.type || 'application/octet-stream'
	})

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

async function start_resumable_session(
	access_token: string,
	file_name: string,
	mime_type: string
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
			body: JSON.stringify({ name: file_name })
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
	controller: AbortController,
	callbacks: UploadCallbacks
): Promise<DriveUploadResult> {
	const session_url = await start_resumable_session(
		access_token,
		file.name,
		file.file.type || 'application/octet-stream'
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
		const result = await upload_file_to_drive(file, access_token, controller, callbacks)

		await make_file_public(result.drive_file_id, access_token)

		if (dataset_id) {
			const supabase_url = await upload_to_supabase_storage(
				file.file,
				dataset_id,
				result.file_name,
				callbacks.on_progress
			)
			await save_image_metadata(dataset_id, result.file_name, supabase_url, result.file_size)
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
			callbacks.on_progress
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
