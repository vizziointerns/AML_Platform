import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Plus, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import VirtualGallery from '../../../../components/VirtualGallery'
import { supabase } from '../../../../utils/supabase'
import { use_datasets } from '../../../../hooks/use_datasets'
import { use_dataset_images } from '../../../../hooks/use_dataset_images'
import { dataset_card } from '../../../../components/datasets/dataset_card'
import { dataset_list_row } from '../../../../components/datasets/dataset_list_row'
import { dataset_toolbar } from '../../../../components/datasets/dataset_toolbar'
import { create_dataset_dialog } from '../../../../components/datasets/create_dataset_dialog'
import type { DatasetInfo } from '../../../../hooks/use_datasets'
import type { DatasetImage } from '../../../../hooks/use_dataset_images'

interface Toast {
	id: string
	message: string
	type: 'success' | 'error'
}

function dataset_explorer_view({
	dataset,
	is_dark_mode,
	on_back,
	on_add_data,
	on_start_training,
	on_start_annotating,
	images,
	on_delete_images,
	is_deleting_images,
	on_open_annotation
}: {
	dataset: DatasetInfo
	is_dark_mode: boolean
	on_back: () => void
	on_add_data: () => void
	on_start_training: () => void
	on_start_annotating: () => void
	images: DatasetImage[]
	on_delete_images: (image_ids: string[]) => Promise<void>
	is_deleting_images: boolean
	on_open_annotation: (image_id: string) => void
}) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const hover_bg_subtle = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
	const hover_border_subtle = is_dark_mode ? 'hover:border-zinc-800' : 'hover:border-zinc-200'

	const gallery_images = images.map((img) => ({
		id: img.id,
		url: img.file_url,
		width: img.width,
		height: img.height,
		classes: img.class_labels,
		status: 'unannotated' as const
	}))

	const handle_open_annotation = (img: { id: string | number }) => {
		on_open_annotation(String(img.id))
	}

	const info_parts = [
		`${images.length.toLocaleString()} images`,
		dataset.class_count > 0 ? `${dataset.class_count} classes` : ''
	].filter(Boolean)

	return (
		<div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-140px)]">
			<div className="page-header shrink-0">
				<div className="flex items-center gap-4">
					<button
						onClick={on_back}
						className={`p-2 rounded-md ${hover_bg_subtle} border border-transparent ${hover_border_subtle} transition-colors text-zinc-500`}
					>
						<ArrowLeft size={20} />
					</button>
					<div>
						<h1 className={`text-2xl font-semibold tracking-tight ${text_heading}`}>
							{dataset.name}
						</h1>
						<p className={`text-sm mt-1 ${text_muted}`}>
							{info_parts.join(' — ') || 'No data yet'}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={on_add_data}
						className={`px-4 py-2 text-sm font-medium flex items-center gap-2 rounded-md border ${border_subtle} ${bg_card} ${hover_bg_subtle} transition-colors ${text_heading}`}
					>
						<Plus size={16} /> Add Data
					</button>
					<button
						onClick={on_start_annotating}
						disabled={images.length === 0}
						className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Start Annotating
					</button>
					<button
						onClick={on_start_training}
						className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm transition-colors"
					>
						Start Training
					</button>
				</div>
			</div>

			<div className="flex-1 min-h-[500px]">
				<VirtualGallery
					is_dark_mode={is_dark_mode}
					images={gallery_images}
					on_delete_selected={on_delete_images}
					is_deleting_selected={is_deleting_images}
					on_open_annotation={handle_open_annotation}
				/>
			</div>
		</div>
	)
}

function rename_dialog({
	is_dark_mode,
	target,
	name,
	on_name_change,
	on_save,
	on_close,
	is_saving
}: {
	is_dark_mode: boolean
	target: DatasetInfo | undefined
	name: string
	on_name_change: (v: string) => void
	on_save: () => void
	on_close: () => void
	is_saving: boolean
}) {
	if (!target) return undefined
	const bg_overlay = is_dark_mode ? 'bg-black/60' : 'bg-black/40'
	const bg_card = is_dark_mode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const input_bg = is_dark_mode
		? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
		: 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
	const btn_border = is_dark_mode
		? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
		: 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
	return (
		<div
			className={`fixed inset-0 ${bg_overlay} flex items-center justify-center z-50`}
			onClick={on_close}
		>
			<div
				className={`w-full max-w-sm rounded-xl border p-6 space-y-4 ${bg_card}`}
				onClick={(e) => e.stopPropagation()}
			>
				<h3 className={`font-semibold ${text_heading}`}>Rename Dataset</h3>
				<input
					type="text"
					value={name}
					onChange={(e) => on_name_change(e.target.value)}
					placeholder="Dataset name"
					className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${input_bg}`}
				/>
				<div className="flex justify-end gap-3 pt-2">
					<button
						onClick={on_close}
						className={`px-4 py-2 text-sm font-medium rounded-lg border ${btn_border} transition-colors`}
					>
						Cancel
					</button>
					<button
						onClick={on_save}
						disabled={is_saving || !name.trim()}
						className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
					>
						{is_saving ? 'Saving...' : 'Save'}
					</button>
				</div>
			</div>
		</div>
	)
}

function delete_dialog({
	is_dark_mode,
	target,
	on_delete,
	on_close,
	is_deleting
}: {
	is_dark_mode: boolean
	target: DatasetInfo | undefined
	on_delete: () => void
	on_close: () => void
	is_deleting: boolean
}) {
	if (!target) return undefined
	const bg_overlay = is_dark_mode ? 'bg-black/60' : 'bg-black/40'
	const bg_card = is_dark_mode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const btn_border = is_dark_mode
		? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
		: 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
	return (
		<div
			className={`fixed inset-0 ${bg_overlay} flex items-center justify-center z-50`}
			onClick={on_close}
		>
			<div
				className={`w-full max-w-sm rounded-xl border p-6 space-y-4 ${bg_card}`}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center gap-3">
					<div className={`p-2 rounded-full ${is_dark_mode ? 'bg-red-500/10' : 'bg-red-50'}`}>
						<AlertTriangle size={20} className="text-red-500" />
					</div>
					<div>
						<h3 className={`font-semibold ${text_heading}`}>Delete Dataset</h3>
						<p className={`text-sm mt-1 ${text_muted}`}>
							Delete "{target.name}" and all its images? This cannot be undone.
						</p>
					</div>
				</div>
				<div className="flex justify-end gap-3 pt-2">
					<button
						onClick={on_close}
						className={`px-4 py-2 text-sm font-medium rounded-lg border ${btn_border} transition-colors`}
					>
						Cancel
					</button>
					<button
						onClick={on_delete}
						disabled={is_deleting}
						className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
					>
						{is_deleting ? 'Deleting...' : 'Delete'}
					</button>
				</div>
			</div>
		</div>
	)
}

function toast_container(
	toasts: Toast[],
	set_toasts: Dispatch<SetStateAction<Toast[]>>,
	is_dark_mode: boolean
) {
	if (toasts.length === 0) return undefined
	return (
		<div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 max-w-sm w-full px-4">
			{toasts.map((t) => (
				<div
					key={t.id}
					className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in slide-in-from-top-2 fade-in duration-300 ${
						t.type === 'success'
							? is_dark_mode
								? 'bg-emerald-900/90 border-emerald-700 text-emerald-200'
								: 'bg-emerald-50 border-emerald-200 text-emerald-800'
							: is_dark_mode
								? 'bg-red-900/90 border-red-700 text-red-200'
								: 'bg-red-50 border-red-200 text-red-800'
					}`}
				>
					{t.type === 'success' ? (
						<CheckCircle2 size={18} className="shrink-0" />
					) : (
						<AlertTriangle size={18} className="shrink-0" />
					)}
					<span className="text-sm font-medium flex-1">{t.message}</span>
					<button
						onClick={() => set_toasts((prev) => prev.filter((x) => x.id !== t.id))}
						className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
					>
						<X size={14} />
					</button>
				</div>
			))}
		</div>
	)
}

export default function datasets_view({
	is_dark_mode,
	on_upload
}: {
	is_dark_mode: boolean
	on_upload: (datasetId?: string) => void
}) {
	const { projectId: project_id } = useParams()
	const navigate = useNavigate()
	const location = useLocation()
	const { datasets, is_loading, refresh } = use_datasets(project_id)

	const path_segments = location.pathname.split('/').filter(Boolean)
	const url_dataset_id =
		path_segments[path_segments.length - 2] === 'datasets'
			? path_segments[path_segments.length - 1]
			: undefined
	const dataset_from_url = url_dataset_id
		? datasets.find((d) => d.id === url_dataset_id)
		: undefined
	const [selected_dataset, set_selected_dataset] = useState<DatasetInfo | undefined>(
		dataset_from_url
	)
	const { images, delete_images } = use_dataset_images(selected_dataset?.id)
	const [view_mode, set_view_mode] = useState<'grid' | 'list'>('grid')
	const [is_create_dialog_open, set_is_create_dialog_open] = useState(false)
	const [toasts, set_toasts] = useState<Toast[]>([])

	const gen_id = () => {
		try {
			return crypto.randomUUID()
		} catch {
			return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
		}
	}
	const show_toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
		const id = gen_id()
		set_toasts((prev) => [...prev, { id, message, type }])
		setTimeout(() => {
			set_toasts((prev) => prev.filter((t) => t.id !== id))
		}, 4000)
	}, [])

	useEffect(() => {
		if (dataset_from_url && dataset_from_url.id !== selected_dataset?.id) {
			set_selected_dataset(dataset_from_url)
		}
		if (!dataset_from_url && selected_dataset) {
			set_selected_dataset(undefined)
		}
	}, [dataset_from_url, selected_dataset])

	const select_dataset = useCallback(
		(ds: DatasetInfo) => {
			navigate(`/projects/${project_id}/datasets/${ds.id}`)
		},
		[navigate, project_id]
	)

	const deselect_dataset = useCallback(() => {
		navigate(`/projects/${project_id}/datasets`)
	}, [navigate, project_id])

	useEffect(() => {
		const on_focus = () => refresh()
		const on_datasets_changed = () => refresh()
		const on_upload_complete = (e: Event) => {
			const detail = (e as CustomEvent).detail as { completed: number; total: number }
			show_toast(`Upload complete: ${detail.completed}/${detail.total} files`)
		}
		window.addEventListener('focus', on_focus)
		window.addEventListener('datasets-changed', on_datasets_changed)
		window.addEventListener('upload-complete', on_upload_complete)
		return () => {
			window.removeEventListener('focus', on_focus)
			window.removeEventListener('datasets-changed', on_datasets_changed)
			window.removeEventListener('upload-complete', on_upload_complete)
		}
	}, [refresh, show_toast])

	const handle_import = () => {
		on_upload(selected_dataset?.id)
	}

	const [search_query, set_search_query] = useState('')
	const filtered_datasets = search_query
		? datasets.filter((ds) => ds.name.toLowerCase().includes(search_query.toLowerCase()))
		: datasets
	const [open_menu_id, set_open_menu_id] = useState<string | undefined>(undefined)
	const [delete_target, set_delete_target] = useState<DatasetInfo | undefined>(undefined)
	const [is_deleting, set_is_deleting] = useState(false)
	const [rename_target, set_rename_target] = useState<DatasetInfo | undefined>(undefined)
	const [rename_name, set_rename_name] = useState('')
	const [is_renaming, set_is_renaming] = useState(false)
	const [is_deleting_images, set_is_deleting_images] = useState(false)

	useEffect(() => {
		if (!open_menu_id) return
		const on_click = () => set_open_menu_id(undefined)
		document.addEventListener('mousedown', on_click)
		return () => document.removeEventListener('mousedown', on_click)
	}, [open_menu_id])

	const handle_delete = async () => {
		if (!delete_target) return
		set_is_deleting(true)
		const { error: ds_err } = await supabase.from('datasets').delete().eq('id', delete_target.id)
		if (ds_err) {
			show_toast(`Failed to delete dataset: ${ds_err.message}`, 'error')
			set_is_deleting(false)
			return
		}
		set_is_deleting(false)
		set_delete_target(undefined)
		show_toast(`Dataset "${delete_target.name}" deleted`)
		window.dispatchEvent(new CustomEvent('datasets-changed'))
		refresh()
	}

	const handle_rename_open = (ds: DatasetInfo) => {
		set_rename_target(ds)
		set_rename_name(ds.name)
	}

	const handle_rename = async () => {
		if (!rename_target || !rename_name.trim()) return
		set_is_renaming(true)
		const { error: rename_err } = await supabase
			.from('datasets')
			.update({ name: rename_name.trim() })
			.eq('id', rename_target.id)
		set_is_renaming(false)
		if (rename_err) {
			show_toast(`Failed to rename: ${rename_err.message}`, 'error')
			return
		}
		set_rename_target(undefined)
		show_toast(`Dataset renamed to "${rename_name.trim()}"`)
		window.dispatchEvent(new CustomEvent('datasets-changed'))
		refresh()
	}

	const handle_delete_images = useCallback(
		async (image_ids: string[]) => {
			if (!selected_dataset || image_ids.length === 0 || is_deleting_images) return

			set_is_deleting_images(true)
			const result = await delete_images(image_ids)
			set_is_deleting_images(false)

			if (!result) {
				show_toast('Failed to delete selected images', 'error')
				return
			}

			show_toast(
				result.deleted_count === 1 ? '1 image deleted' : `${result.deleted_count} images deleted`
			)
			refresh()
		},
		[delete_images, is_deleting_images, refresh, selected_dataset, show_toast]
	)

	const dialog_element = create_dataset_dialog({
		is_open: is_create_dialog_open,
		on_close: () => set_is_create_dialog_open(false),
		project_id,
		is_dark_mode,
		on_created: () => {
			window.dispatchEvent(new CustomEvent('datasets-changed'))
			refresh()
			show_toast('Dataset created')
		}
	})

	if (selected_dataset) {
		return (
			<>
				{toast_container(toasts, set_toasts, is_dark_mode)}
				{dataset_explorer_view({
					dataset: selected_dataset,
					is_dark_mode,
					on_back: deselect_dataset,
					on_add_data: handle_import,
					on_start_annotating: () => {
						const first_image = images[0]
						if (first_image) {
							navigate(`/projects/${project_id}/annotation/${first_image.id}`)
						}
					},
					on_start_training: () => navigate(`/projects/${project_id}/training`),
					images,
					on_delete_images: handle_delete_images,
					is_deleting_images,
					on_open_annotation: (image_id: string) =>
						navigate(`/projects/${project_id}/annotation/${image_id}`)
				})}
			</>
		)
	}

	return (
		<>
			{toast_container(toasts, set_toasts, is_dark_mode)}
			{dataset_toolbar({
				search_query,
				on_search_change: set_search_query,
				view_mode,
				on_view_mode_change: set_view_mode,
				is_dark_mode,
				on_import: handle_import,
				on_create: () => set_is_create_dialog_open(true)
			})}

			<div className="mt-6">
				{is_loading ? (
					<div className="flex items-center justify-center py-20">
						<div className="loading-spinner" />
					</div>
				) : filtered_datasets.length === 0 ? (
					<div
						className={`flex flex-col items-center justify-center py-20 ${is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'}`}
					>
						<p className="text-sm">No datasets yet. Create one to get started.</p>
					</div>
				) : view_mode === 'grid' ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{filtered_datasets.map((ds) =>
							dataset_card({
								key: ds.id,
								dataset: ds,
								is_dark_mode,
								on_select: select_dataset,
								on_rename: handle_rename_open,
								on_delete: set_delete_target,
								is_menu_open: open_menu_id === ds.id,
								on_menu_toggle: () => set_open_menu_id(open_menu_id === ds.id ? undefined : ds.id)
							})
						)}
					</div>
				) : (
					(() => {
						const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
						const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'
						return (
							<div
								className={`rounded-xl border ${border_subtle} ${is_dark_mode ? 'bg-zinc-900' : 'bg-white'} overflow-hidden`}
							>
								<table className="w-full text-sm text-left">
									<thead
										className={`text-xs uppercase ${bg_subtle} ${is_dark_mode ? 'text-zinc-400 border-b border-zinc-800' : 'text-zinc-500 border-b border-zinc-200'}`}
									>
										<tr>
											<th className="px-6 py-4 font-medium">Dataset</th>
											<th className="px-6 py-4 font-medium">Size</th>
											<th className="px-6 py-4 font-medium">Status</th>
											<th className="px-6 py-4 font-medium">Tags</th>
											<th className="px-6 py-4 font-medium text-right">Last Updated</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-zinc-800/20">
										{filtered_datasets.map((ds) =>
											dataset_list_row({
												key: ds.id,
												dataset: ds,
												is_dark_mode,
												on_select: select_dataset
											})
										)}
									</tbody>
								</table>
							</div>
						)
					})()
				)}
			</div>

			{dialog_element}
			{rename_dialog({
				is_dark_mode,
				target: rename_target,
				name: rename_name,
				on_name_change: set_rename_name,
				on_save: handle_rename,
				on_close: () => set_rename_target(undefined),
				is_saving: is_renaming
			})}
			{delete_dialog({
				is_dark_mode,
				target: delete_target,
				on_delete: handle_delete,
				on_close: () => set_delete_target(undefined),
				is_deleting
			})}
		</>
	)
}
