import { useState, useRef, useCallback, useEffect } from 'react'
import type { UploadFile } from '../components/Uploader/types'
import { upload_file, upload_to_drive_and_save, cancel_all_uploads } from '../api/upload'
import { supabase } from '../utils/supabase'
import { use_google_auth } from './use_google_auth'
import { use_datasets } from './use_datasets'

export function use_upload(on_close: () => void) {
	const [is_minimized, set_is_minimized] = useState(false)
	const [files, set_files] = useState<UploadFile[]>([])
	const [is_drag_active, set_is_drag_active] = useState(false)

	const project_id = (() => {
		const match = window.location.pathname.match(/\/projects\/([^/]+)/)
		return match ? match[1] : undefined
	})()

	const { datasets } = use_datasets(project_id)
	const [target_dataset, set_target_dataset] = useState('')
	const [new_dataset_name, set_new_dataset_name] = useState('')
	const [new_dataset_description, set_new_dataset_description] = useState('')
	const resolved_dataset_id_ref = useRef<string | undefined>(undefined)

	useEffect(() => {
		if (!target_dataset && datasets.length > 0) {
			const first = datasets[0]
			if (first) set_target_dataset(first.id)
		}
	}, [datasets, target_dataset])
	const file_input_ref = useRef<HTMLInputElement>(undefined!)
	const folder_input_ref = useRef<HTMLInputElement>(undefined!)
	const google_auth = use_google_auth()

	/* runs once on mount: auto-trigger Google auth when the dialog opens */
	const auto_connect_ref = useRef(false)
	useEffect(() => {
		if (
			!auto_connect_ref.current &&
			google_auth.is_configured &&
			!google_auth.is_authenticated &&
			!google_auth.is_loading
		) {
			auto_connect_ref.current = true
			google_auth.sign_in()
		}
	}, [google_auth])

	const total_files = files.length
	const completed_files = files.filter((f) => f.status === 'success').length
	const error_files = files.filter((f) => f.status === 'error').length
	const is_uploading = files.some((f) => f.status === 'uploading')
	const pending_count = files.filter((f) => f.status === 'pending').length
	const is_all_complete = !is_uploading && total_files > 0 && completed_files === total_files

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

	const [should_upload_after_auth, set_should_upload_after_auth] = useState(false)

	const make_callbacks = useCallback(
		(file: UploadFile) => ({
			on_progress: (progress: number, loaded: number, total: number) => {
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
			on_error: (error: string) => {
				set_files((prev) =>
					prev.map((f) => (f.id === file.id ? { ...f, status: 'error', error } : f))
				)
			}
		}),
		[]
	)

	const resolve_dataset_id = useCallback(async (): Promise<string | undefined> => {
		if (target_dataset === '__new__') {
			if (!new_dataset_name.trim()) {
				return undefined
			}
			const { data, error: err } = await supabase
				.from('datasets')
				.insert({
					project_id,
					name: new_dataset_name.trim(),
					description: new_dataset_description.trim() || undefined,
					status: 'Processing',
					image_count: 0,
					class_count: 0,
					tags: [],
					storage_bytes: 0
				})
				.select('id')
				.single()
			if (err || !data) {
				console.error('Failed to create dataset:', err)
				return undefined
			}
			resolved_dataset_id_ref.current = data.id
			return data.id
		}
		resolved_dataset_id_ref.current = target_dataset || undefined
		return target_dataset || undefined
	}, [target_dataset, new_dataset_name, new_dataset_description, project_id])

	const start_upload = useCallback(async () => {
		const pending_files = files.filter((f) => f.status === 'pending')
		if (pending_files.length === 0) return

		if (google_auth.is_configured && !google_auth.is_authenticated && !google_auth.is_loading) {
			set_should_upload_after_auth(true)
			google_auth.sign_in()
			return
		}

		const dataset_id = await resolve_dataset_id()
		if (!dataset_id) {
			return
		}

		set_files((prev) =>
			prev.map((f) => (f.status === 'pending' ? { ...f, status: 'uploading' } : f))
		)

		const uploads = pending_files.map((file) => {
			const callbacks = make_callbacks(file)

			if (google_auth.is_authenticated) {
				return upload_to_drive_and_save(
					file,
					google_auth.access_token!,
					dataset_id,
					project_id,
					callbacks
				)
			}

			return upload_file(file, dataset_id, callbacks)
		})

		await Promise.allSettled(uploads)
	}, [files, target_dataset, google_auth, project_id, make_callbacks, resolve_dataset_id])

	const start_upload_ref = useRef(start_upload)
	start_upload_ref.current = start_upload

	useEffect(() => {
		if (should_upload_after_auth && google_auth.is_authenticated) {
			set_should_upload_after_auth(false)
			setTimeout(() => start_upload_ref.current(), 0)
		}
	}, [should_upload_after_auth, google_auth.is_authenticated])

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
				const callbacks = make_callbacks(file_to_upload)
				const ds_id = resolved_dataset_id_ref.current ?? target_dataset
				if (!ds_id) {
					callbacks.on_error('No dataset selected for upload')
					return
				}
				if (google_auth.is_authenticated) {
					upload_to_drive_and_save(
						file_to_upload,
						google_auth.access_token!,
						ds_id,
						project_id,
						callbacks
					)
				} else {
					upload_file(file_to_upload, ds_id, callbacks)
				}
			}
		},
		[target_dataset, google_auth, project_id, make_callbacks]
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
		const completed = files.filter((f) => f.status === 'success').length
		const total = files.length
		cancel_all_uploads(files.map((f) => f.id))
		for (const f of files) {
			if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
		}
		set_files([])
		set_is_minimized(false)
		resolved_dataset_id_ref.current = undefined
		window.dispatchEvent(new CustomEvent('datasets-changed'))
		if (completed > 0) {
			window.dispatchEvent(new CustomEvent('upload-complete', { detail: { completed, total } }))
		}
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
		close_and_clear,
		google_auth,
		datasets,
		new_dataset_name,
		set_new_dataset_name,
		new_dataset_description,
		set_new_dataset_description,
		is_all_complete
	}
}
