export type UploadStatus = 'pending' | 'uploading' | 'paused' | 'success' | 'error'

export interface UploadFile {
	id: string
	file: File
	name: string
	size: number
	previewUrl?: string
	progress: number
	status: UploadStatus
	error?: string
	chunkProgress?: { loaded: number; total: number }
}
