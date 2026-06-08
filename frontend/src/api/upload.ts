import type { UploadFile } from '../components/Uploader/types'

export type UploadProgressCallback = (progress: number, loaded: number, total: number) => void
export type UploadCompleteCallback = () => void
export type UploadErrorCallback = (error: string) => void

export interface UploadCallbacks {
	on_progress: UploadProgressCallback
	on_complete: UploadCompleteCallback
	on_error: UploadErrorCallback
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

async function simulate_chunk_upload(
	controller: AbortController,
	file: UploadFile,
	callbacks: UploadCallbacks
): Promise<void> {
	const total_chunks = 20
	for (let chunk = 0; chunk < total_chunks; chunk++) {
		if (controller.signal.aborted) return

		if (file.progress > 40 && file.progress < 60 && Math.random() < 0.05) {
			throw new Error('Network timeout during chunk sequence.')
		}

		await new Promise<void>((resolve) => setTimeout(resolve, 500 + Math.random() * 300))

		if (controller.signal.aborted) return

		const progress = Math.min(100, ((chunk + 1) / total_chunks) * 100)
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
