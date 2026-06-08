import { useState, useRef, useCallback, useEffect } from 'react'
import type { UploadFile } from '../components/Uploader/types'
import { upload_file, cancel_all_uploads } from '../api/upload'

export function use_upload(on_close: () => void) {
	const [is_minimized, set_is_minimized] = useState(false)
	const [files, set_files] = useState<UploadFile[]>([])
	const [is_drag_active, set_is_drag_active] = useState(false)
	const [target_dataset, set_target_dataset] = useState('Urban_Vehicles_v4')
	const file_input_ref = useRef<HTMLInputElement>(undefined!)
	const folder_input_ref = useRef<HTMLInputElement>(undefined!)

	const total_files = files.length
	const completed_files = files.filter((f) => f.status === 'success').length
	const error_files = files.filter((f) => f.status === 'error').length
	const is_uploading = files.some((f) => f.status === 'uploading')
	const pending_count = files.filter((f) => f.status === 'pending').length

	const format_size = useCallback((bytes: number) => {
		if (bytes === 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
	}, [])

	const process_files = useCallback((new_files: File[]) => {
		const processed: UploadFile[] = new_files.map((f) => {
			let preview_url
			if (f.type.startsWith('image/')) {
				preview_url = URL.createObjectURL(f)
			}
			return {
				id: crypto.randomUUID(),
				file: f,
				name: f.name,
				size: f.size,
				previewUrl: preview_url,
				progress: 0,
				status: f.type.startsWith('image/') || f.name.endsWith('.zip') ? 'pending' : 'error',
				error:
					!f.type.startsWith('image/') && !f.name.endsWith('.zip')
						? 'Unsupported file format.'
						: undefined
			}
		})
		set_files((prev) => [...prev, ...processed])
	}, [])

	const handle_file_change = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (e.target.files && e.target.files.length > 0) {
				process_files(Array.from(e.target.files))
			}
		},
		[process_files]
	)

	const handle_drag_enter = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		set_is_drag_active(true)
	}, [])

	const handle_drag_leave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		set_is_drag_active(false)
	}, [])

	const handle_drag_over = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
	}, [])

	const handle_drop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			e.stopPropagation()
			set_is_drag_active(false)
			if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
				process_files(Array.from(e.dataTransfer.files))
			}
		},
		[process_files]
	)

	const start_upload = useCallback(async () => {
		const pending_files = files.filter((f) => f.status === 'pending')
		if (pending_files.length === 0) return

		set_files((prev) =>
			prev.map((f) => (f.status === 'pending' ? { ...f, status: 'uploading' } : f))
		)

		const uploads = pending_files.map((file) =>
			upload_file(file, target_dataset, {
				on_progress: (progress, loaded, total) => {
					set_files((prev) =>
						prev.map((f) =>
							f.id === file.id ? { ...f, progress, chunkProgress: { loaded, total } } : f
						)
					)
				},
				on_complete: () => {
					set_files((prev) =>
						prev.map((f) =>
							f.id === file.id
								? {
										...f,
										progress: 100,
										status: 'success',
										chunkProgress: { loaded: f.size, total: f.size }
									}
								: f
						)
					)
				},
				on_error: (error) => {
					set_files((prev) =>
						prev.map((f) => (f.id === file.id ? { ...f, status: 'error', error } : f))
					)
				}
			})
		)

		await Promise.allSettled(uploads)
	}, [files, target_dataset])

	const retry_upload = useCallback(
		(id: string) => {
			let file_to_upload: UploadFile | undefined
			set_files((prev) => {
				const found = prev.find((f) => f.id === id)
				if (found) {
					file_to_upload = { ...found, status: 'uploading', progress: 0, error: undefined }
				}
				return prev.map((f) =>
					f.id === id
						? { ...f, status: 'uploading', error: undefined, progress: 0, chunkProgress: undefined }
						: f
				)
			})
			if (file_to_upload) {
				upload_file(file_to_upload, target_dataset, {
					on_progress: (progress, loaded, total) => {
						set_files((prev) =>
							prev.map((f) =>
								f.id === id ? { ...f, progress, chunkProgress: { loaded, total } } : f
							)
						)
					},
					on_complete: () => {
						set_files((prev) =>
							prev.map((f) =>
								f.id === id
									? {
											...f,
											progress: 100,
											status: 'success',
											chunkProgress: { loaded: f.size, total: f.size }
										}
									: f
							)
						)
					},
					on_error: (error) => {
						set_files((prev) =>
							prev.map((f) => (f.id === id ? { ...f, status: 'error', error } : f))
						)
					}
				})
			}
		},
		[target_dataset]
	)

	const remove_file = useCallback((id: string) => {
		set_files((prev) => {
			const file_to_remove = prev.find((f) => f.id === id)
			if (file_to_remove?.previewUrl) URL.revokeObjectURL(file_to_remove.previewUrl)
			return prev.filter((f) => f.id !== id)
		})
	}, [])

	const clear_all = useCallback(() => {
		cancel_all_uploads(files.map((f) => f.id))
		set_files([])
	}, [files])

	const close_and_clear = useCallback(() => {
		cancel_all_uploads(files.map((f) => f.id))
		for (const f of files) {
			if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
		}
		set_files([])
		set_is_minimized(false)
		on_close()
	}, [files, on_close])

	useEffect(() => {
		const current_files = [...files]
		return () => {
			for (const f of current_files) {
				if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
			}
		}
	}, [files])

	return {
		files,
		is_minimized,
		set_is_minimized,
		is_drag_active,
		target_dataset,
		set_target_dataset,
		file_input_ref,
		folder_input_ref,
		total_files,
		completed_files,
		error_files,
		is_uploading,
		pending_count,
		format_size,
		handle_drag_enter,
		handle_drag_leave,
		handle_drag_over,
		handle_drop,
		handle_file_change,
		start_upload,
		retry_upload,
		remove_file,
		clear_all,
		close_and_clear
	}
}
