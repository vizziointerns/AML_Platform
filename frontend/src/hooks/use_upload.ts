import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UploadFile } from '../components/Uploader/types'
import { upload_to_drive_and_save, cancel_all_uploads } from '../api/upload'
import { generate_tiff_preview } from '../utils/tiff'
import { supabase } from '../utils/supabase'
import { use_datasets } from './use_datasets'

async function create_dataset_for_upload(params: {
	project_id: string | undefined
	dataset_id: string
	dataset_name: string
	dataset_description: string
}): Promise<string | undefined> {
	const { project_id, dataset_id, dataset_name, dataset_description } = params

	const { data, error: err } = await supabase
		.from('datasets')
		.insert({
			id: dataset_id,
			project_id,
			name: dataset_name,
			description: dataset_description || undefined,
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

	return data.id
}

function read_all_entries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
	return new Promise((resolve, reject) => {
		const all: FileSystemEntry[] = []
		const read_batch = () => {
			reader.readEntries((entries) => {
				if (entries.length === 0) {
					resolve(all)
				} else {
					all.push(...entries)
					read_batch()
				}
			}, reject)
		}
		read_batch()
	})
}

async function traverse_entry(entry: FileSystemEntry): Promise<File[]> {
	if (entry.isFile) {
		const file_entry = entry as FileSystemFileEntry
		return new Promise((resolve, reject) => {
			file_entry.file((f) => resolve([f]), reject)
		})
	}
	if (entry.isDirectory) {
		const dir_entry = entry as FileSystemDirectoryEntry
		const entries = await read_all_entries(dir_entry.createReader())
		const nested = await Promise.all(entries.map(traverse_entry))
		return nested.flat()
	}
	return []
}

function classify_drop_item(
	item: DataTransferItem,
	loose_files: File[],
	folder_promises: Promise<File[]>[]
) {
	if (item.kind !== 'file') return
	const entry = item.webkitGetAsEntry?.()
	if (entry?.isDirectory) {
		folder_promises.push(traverse_entry(entry))
		return
	}
	const f = item.getAsFile()
	if (f) loose_files.push(f)
}

function collect_folder_drop_files(
	e: React.DragEvent,
	on_loose_files: (files: File[]) => void,
	on_folder_files: (files: File[]) => void,
	is_active?: () => boolean
) {
	const items = Array.from(e.dataTransfer.items)
	const loose_files: File[] = []
	const folder_promises: Promise<File[]>[] = []

	for (const item of items) {
		classify_drop_item(item, loose_files, folder_promises)
	}

	if (items.length === 0 && e.dataTransfer.files.length > 0) {
		loose_files.push(...Array.from(e.dataTransfer.files))
	}

	if (loose_files.length > 0) {
		on_loose_files(loose_files)
	}

	void Promise.all(folder_promises).then((nested) => {
		if (is_active && !is_active()) return
		const collected = nested.flat()
		if (collected.length > 0) on_folder_files(collected)
	})
}

interface ProjectOption {
	id: string
	name: string
}

export function use_upload(on_close: () => void, initial_dataset_id?: string, folder_only = false) {
	const [is_minimized, set_is_minimized] = useState(false)
	const [files, set_files] = useState<UploadFile[]>([])
	const [is_drag_active, set_is_drag_active] = useState(false)
	const [projects, set_projects] = useState<ProjectOption[]>([])
	const [target_project_id, set_target_project_id] = useState<string | undefined>(undefined)

	const url_project_id = (() => {
		const match = window.location.pathname.match(/\/projects\/([^/]+)/)
		return match ? match[1] : undefined
	})()

	const project_id = target_project_id ?? url_project_id

	const navigate = useNavigate()
	const { datasets } = use_datasets(project_id)

	/* fetch available projects when no project context from URL */
	useEffect(() => {
		if (url_project_id) return
		supabase.auth.getUser().then(({ data: { user } }) => {
			if (!user) return
			supabase
				.from('projects')
				.select('id, name')
				.eq('user_id', user.id)
				.then(({ data }) => {
					if (data && data.length > 0) {
						set_projects(data as ProjectOption[])
						if (!target_project_id) {
							set_target_project_id((data[0] as ProjectOption).id)
						}
					}
				})
		})
	}, [url_project_id])

	const [target_dataset, set_target_dataset] = useState(initial_dataset_id ?? '')
	const [new_dataset_name, set_new_dataset_name] = useState('')
	const [new_dataset_description, set_new_dataset_description] = useState('')
	const resolved_dataset_id_ref = useRef<string | undefined>(undefined)
	const is_active_ref = useRef(true)
	const files_ref = useRef(files)
	files_ref.current = files

	useEffect(() => {
		if (!target_dataset && datasets.length > 0) {
			const first = datasets[0]
			if (first) set_target_dataset(first.id)
		}
	}, [datasets, target_dataset])

	useEffect(() => {
		set_target_dataset(initial_dataset_id ?? '')
	}, [initial_dataset_id])
	const file_input_ref = useRef<HTMLInputElement>(undefined!)
	const folder_input_ref = useRef<HTMLInputElement>(undefined!)

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

	const process_files = useCallback(
		(new_files: File[]) => {
			const is_add_data = !!initial_dataset_id
			const processed: UploadFile[] = new_files.map((f) => {
				const is_image =
					f.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|tiff?)$/i.test(f.name)
				const is_zip = f.name.endsWith('.zip')
				const is_tiff = /\.tiff?$/i.test(f.name)
				let preview_url
				if (is_image && !is_tiff) {
					preview_url = URL.createObjectURL(f)
				}
				let status: 'pending' | 'error'
				let error: string | undefined
				if (is_add_data) {
					status = is_image ? 'pending' : 'error'
					error = !is_image
						? 'Only image files are accepted. Supported formats: JPG, PNG, WEBP, BMP, TIFF'
						: undefined
				} else {
					status = is_image || is_zip || is_tiff ? 'pending' : 'error'
					error = !is_image && !is_zip && !is_tiff ? 'Unsupported file format.' : undefined
				}
				return {
					id: crypto.randomUUID(),
					file: f,
					name: f.name,
					size: f.size,
					previewUrl: preview_url,
					progress: 0,
					status,
					error
				}
			})
			set_files((prev) => [...prev, ...processed])

			for (const item of processed) {
				if (/\.tiff?$/i.test(item.name)) {
					generate_tiff_preview(item.file).then((url) => {
						if (url) {
							set_files((prev) =>
								prev.map((f) => (f.id === item.id ? { ...f, previewUrl: url } : f))
							)
						}
					})
				}
			}
		},
		[initial_dataset_id]
	)

	const process_loose_files_as_errors = useCallback((new_files: File[]) => {
		const processed: UploadFile[] = new_files.map((f) => ({
			id: crypto.randomUUID(),
			file: f,
			name: f.name,
			size: f.size,
			progress: 0,
			status: 'error' as const,
			error: 'Folders only. Please upload a folder instead.'
		}))
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

			if (folder_only) {
				collect_folder_drop_files(
					e,
					process_loose_files_as_errors,
					process_files,
					() => is_active_ref.current
				)
				return
			}

			if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
				process_files(Array.from(e.dataTransfer.files))
			}
		},
		[process_files, process_loose_files_as_errors, folder_only]
	)

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
		if (target_dataset !== '__new__') {
			resolved_dataset_id_ref.current = target_dataset || undefined
			return target_dataset || undefined
		}

		const trimmed_dataset_name = new_dataset_name.trim()
		if (!trimmed_dataset_name) {
			return undefined
		}

		const created_dataset_id = await create_dataset_for_upload({
			project_id,
			dataset_id: crypto.randomUUID(),
			dataset_name: trimmed_dataset_name,
			dataset_description: new_dataset_description.trim()
		})

		if (!created_dataset_id) {
			return undefined
		}

		resolved_dataset_id_ref.current = created_dataset_id
		return created_dataset_id
	}, [target_dataset, new_dataset_name, new_dataset_description, project_id])

	const start_upload = useCallback(async () => {
		const pending_files = files.filter((f) => f.status === 'pending')
		if (pending_files.length === 0) return

		const dataset_id = await resolve_dataset_id()
		if (!dataset_id) {
			set_files((prev) =>
				prev.map((f) =>
					f.status === 'pending'
						? {
								...f,
								status: 'error',
								error: 'No dataset selected. Select or create a dataset first.'
							}
						: f
				)
			)
			return
		}

		for (const file of pending_files) {
			set_files((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: 'uploading' } : f)))

			const callbacks = make_callbacks(file)
			await upload_to_drive_and_save(file, '', dataset_id, project_id, callbacks)
		}
	}, [files, target_dataset, project_id, make_callbacks, resolve_dataset_id])

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
				void resolve_dataset_id().then((ds_id) => {
					if (!ds_id) {
						callbacks.on_error('No dataset selected. Select or create a dataset first.')
						return
					}
					upload_to_drive_and_save(file_to_upload!, '', ds_id, project_id, callbacks)
				})
			}
		},
		[project_id, make_callbacks, resolve_dataset_id]
	)

	const remove_file = useCallback((id: string) => {
		set_files((prev) => {
			const file_to_remove = prev.find((f) => f.id === id)
			if (file_to_remove?.previewUrl) URL.revokeObjectURL(file_to_remove.previewUrl)
			return prev.filter((f) => f.id !== id)
		})
	}, [])

	const clear_all = useCallback(() => {
		is_active_ref.current = false
		cancel_all_uploads(files.map((f) => f.id))
		for (const f of files) {
			if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
		}
		set_files([])
	}, [files])

	const close_and_clear = useCallback(() => {
		is_active_ref.current = false
		const completed = files.filter((f) => f.status === 'success').length
		const total = files.length
		const ds_id = resolved_dataset_id_ref.current
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
		if (ds_id && project_id) {
			navigate(`/projects/${project_id}/datasets/${ds_id}`)
		}
	}, [files, on_close, project_id, navigate])

	useEffect(() => {
		return () => {
			is_active_ref.current = false
			for (const f of files_ref.current) {
				if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
			}
		}
	}, [])

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
		datasets,
		new_dataset_name,
		set_new_dataset_name,
		new_dataset_description,
		set_new_dataset_description,
		is_all_complete,
		projects,
		target_project_id,
		set_target_project_id,
		url_project_id
	}
}
