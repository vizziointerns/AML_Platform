import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, AlertTriangle, CheckCircle2, Copy, Pencil } from 'lucide-react'
import { supabase } from '../../utils/supabase'
import { use_app_context } from '../../contexts/app_context'
import { use_all_datasets, type GlobalDatasetInfo } from '../../hooks/use_all_datasets'
import { global_dataset_card } from '../../components/datasets/global_dataset_card'
import { dataset_search_bar } from '../../components/datasets/dataset_search_bar'
import { filter_bar } from '../../components/FilterBar'
import { use_project_store } from '../../store/projectStore'

interface Toast {
	id: string
	message: string
	type: 'success' | 'error'
}

function gen_id(): string {
	try {
		return crypto.randomUUID()
	} catch {
		return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
	}
}

export default function datasets_page() {
	const { is_dark_mode } = use_app_context()
	const navigate = useNavigate()
	const { datasets, is_loading, error: fetch_error, refresh } = use_all_datasets()
	const [toasts, set_toasts] = useState<Toast[]>([])

	const show_toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
		const id = gen_id()
		set_toasts((prev) => [...prev, { id, message, type }])
		setTimeout(() => {
			set_toasts((prev) => prev.filter((t) => t.id !== id))
		}, 4000)
	}, [])

	useEffect(() => {
		const on_datasets_changed = () => refresh()
		window.addEventListener('datasets-changed', on_datasets_changed)
		return () => window.removeEventListener('datasets-changed', on_datasets_changed)
	}, [refresh])

	const [search_query, set_search_query] = useState('')
	const project_type_filters = use_project_store((s) => s.project_type_filters)
	const sort_order = use_project_store((s) => s.sort_order)
	const set_project_type_filters = use_project_store((s) => s.set_project_type_filters)
	const set_sort_order = use_project_store((s) => s.set_sort_order)
	const clear_filters = use_project_store((s) => s.clear_filters)

	const filtered_datasets = useMemo(() => {
		let result = datasets

		if (search_query) {
			const q = search_query.toLowerCase()
			result = result.filter(
				(ds) => ds.name.toLowerCase().includes(q) || ds.project_name.toLowerCase().includes(q)
			)
		}

		if (project_type_filters.length > 0) {
			result = result.filter((ds) => project_type_filters.includes(ds.project_type))
		}

		result = [...result].sort((a, b) => {
			const date_a = new Date(a.created_at).getTime()
			const date_b = new Date(b.created_at).getTime()
			return sort_order === 'newest' ? date_b - date_a : date_a - date_b
		})

		return result
	}, [datasets, search_query, project_type_filters, sort_order])

	const [open_menu_id, set_open_menu_id] = useState<string | undefined>(undefined)

	useEffect(() => {
		if (!open_menu_id) return
		const on_click = () => set_open_menu_id(undefined)
		document.addEventListener('mousedown', on_click)
		return () => document.removeEventListener('mousedown', on_click)
	}, [open_menu_id])

	const handle_view = useCallback(
		(ds: GlobalDatasetInfo) => {
			navigate(`/projects/${ds.project_id}/datasets/${ds.id}`)
		},
		[navigate]
	)

	const [rename_target, set_rename_target] = useState<GlobalDatasetInfo | undefined>(undefined)
	const [rename_name, set_rename_name] = useState('')
	const [is_renaming, set_is_renaming] = useState(false)

	const handle_rename = async () => {
		if (!rename_target || !rename_name.trim()) return
		set_is_renaming(true)
		const { error: err } = await supabase
			.from('datasets')
			.update({ name: rename_name.trim() })
			.eq('id', rename_target.id)
		set_is_renaming(false)
		if (err) {
			show_toast(`Failed to rename: ${err.message}`, 'error')
			return
		}
		set_rename_target(undefined)
		show_toast(`Dataset renamed to "${rename_name.trim()}"`)
		refresh()
	}

	const [delete_target, set_delete_target] = useState<GlobalDatasetInfo | undefined>(undefined)
	const [delete_confirm_name, set_delete_confirm_name] = useState('')
	const [is_deleting, set_is_deleting] = useState(false)

	const handle_delete = async () => {
		if (!delete_target || delete_confirm_name !== delete_target.name) return
		set_is_deleting(true)
		const { error: err } = await supabase.from('datasets').delete().eq('id', delete_target.id)
		set_is_deleting(false)
		if (err) {
			show_toast(`Failed to delete: ${err.message}`, 'error')
			return
		}
		set_delete_target(undefined)
		set_delete_confirm_name('')
		show_toast(`Dataset "${delete_target.name}" deleted`)
		window.dispatchEvent(new CustomEvent('datasets-changed'))
		refresh()
	}

	const [duplicate_target, set_duplicate_target] = useState<GlobalDatasetInfo | undefined>(
		undefined
	)
	const [is_duplicating, set_is_duplicating] = useState(false)

	const handle_duplicate = async () => {
		if (!duplicate_target) return
		set_is_duplicating(true)
		const new_name = `${duplicate_target.name} (Copy)`
		const { error: err } = await supabase.from('datasets').insert({
			project_id: duplicate_target.project_id,
			name: new_name,
			description: duplicate_target.description,
			status: 'Processing',
			image_count: 0,
			class_count: 0,
			tags: duplicate_target.tags,
			storage_bytes: 0
		})
		set_is_duplicating(false)
		set_duplicate_target(undefined)
		if (err) {
			show_toast(`Failed to duplicate: ${err.message}`, 'error')
			return
		}
		show_toast(`Dataset duplicated as "${new_name}"`)
		window.dispatchEvent(new CustomEvent('datasets-changed'))
		refresh()
	}

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const overlay_bg = is_dark_mode ? 'bg-black/60' : 'bg-black/40'

	return (
		<main className="flex flex-col flex-1 min-w-0">
			<div className="flex-1 overflow-y-auto">
				<div className="page-layout">
					<div className="page-content">
						<div className="page-header mb-2">
							<div>
								<h1 className={`text-2xl font-semibold tracking-tight ${text_heading}`}>
									All Datasets
								</h1>
								<p className={`text-sm mt-1 ${text_muted}`}>
									Browse and manage all datasets across your projects.
								</p>
							</div>
						</div>

						{dataset_search_bar({
							search_query,
							on_search_change: set_search_query,
							is_dark_mode
						})}

						<div className="pb-3">
							{filter_bar({
								sort_order,
								project_type_filters,
								on_sort_order_change: set_sort_order,
								on_project_type_filters_change: set_project_type_filters,
								on_clear: clear_filters,
								is_dark_mode
							})}
						</div>

						{is_loading ? (
							<div className="flex items-center justify-center py-24">
								<div className="loading-spinner" />
							</div>
						) : fetch_error ? (
							<div className={`flex flex-col items-center justify-center py-24 ${text_muted}`}>
								<p className="text-sm">Failed to load datasets.</p>
								<p className="text-xs mt-1">{fetch_error}</p>
							</div>
						) : filtered_datasets.length === 0 ? (
							<div className={`flex flex-col items-center justify-center py-24 ${text_muted}`}>
								<p className="text-sm">No datasets found.</p>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
								{filtered_datasets.map((ds) =>
									global_dataset_card({
										dataset: ds,
										is_dark_mode,
										on_view: handle_view,
										on_edit: () => {
											set_rename_target(ds)
											set_rename_name(ds.name)
										},
										on_delete: () => set_delete_target(ds),
										on_duplicate: () => set_duplicate_target(ds),
										is_menu_open: open_menu_id === ds.id,
										on_menu_toggle: () =>
											set_open_menu_id(open_menu_id === ds.id ? undefined : ds.id)
									})
								)}
							</div>
						)}
					</div>
				</div>
			</div>

			{rename_target &&
				(() => {
					const btn_border = is_dark_mode
						? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
						: 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
					const input_bg = is_dark_mode
						? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
						: 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
					return (
						<div
							className={`fixed inset-0 ${overlay_bg} flex items-center justify-center z-50`}
							onClick={() => set_rename_target(undefined)}
						>
							<div
								className={`w-full max-w-sm rounded-xl border p-6 space-y-4 ${bg_card}`}
								onClick={(e) => e.stopPropagation()}
							>
								<div className="flex items-center gap-3">
									<div
										className={`p-2 rounded-full ${is_dark_mode ? 'bg-blue-500/10' : 'bg-blue-50'}`}
									>
										<Pencil size={18} className="text-blue-500" />
									</div>
									<div>
										<h3 className={`font-semibold ${text_heading}`}>Edit Dataset</h3>
										<p className={`text-xs ${text_muted} mt-0.5`}>
											Rename dataset &quot;{rename_target.name}&quot;
										</p>
									</div>
									<button
										onClick={() => set_rename_target(undefined)}
										className={`ml-auto p-1 rounded-md ${is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} ${text_muted}`}
									>
										<X size={16} />
									</button>
								</div>
								<input
									type="text"
									value={rename_name}
									onChange={(e) => set_rename_name(e.target.value)}
									placeholder="Dataset name"
									className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${input_bg}`}
								/>
								<div className="flex justify-end gap-3">
									<button
										onClick={() => set_rename_target(undefined)}
										className={`px-4 py-2 text-sm font-medium rounded-lg border ${btn_border} transition-colors`}
									>
										Cancel
									</button>
									<button
										onClick={handle_rename}
										disabled={is_renaming || !rename_name.trim()}
										className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
									>
										{is_renaming ? 'Saving...' : 'Save'}
									</button>
								</div>
							</div>
						</div>
					)
				})()}

			{delete_target &&
				(() => {
					const btn_border = is_dark_mode
						? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
						: 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
					const input_bg = is_dark_mode
						? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
						: 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
					const is_confirm_valid = delete_confirm_name === delete_target.name
					return (
						<div
							className={`fixed inset-0 ${overlay_bg} flex items-center justify-center z-50`}
							onClick={() => {
								set_delete_target(undefined)
								set_delete_confirm_name('')
							}}
						>
							<div
								className={`w-full max-w-sm rounded-xl border p-6 space-y-4 ${bg_card}`}
								onClick={(e) => e.stopPropagation()}
							>
								<div className="flex items-center gap-3">
									<div
										className={`p-2 rounded-full ${is_dark_mode ? 'bg-red-500/10' : 'bg-red-50'}`}
									>
										<AlertTriangle size={20} className="text-red-500" />
									</div>
									<div>
										<h3 className={`font-semibold ${text_heading}`}>Delete Dataset</h3>
										<p className={`text-xs ${text_muted} mt-0.5`}>
											Type the dataset name to confirm deletion.
										</p>
									</div>
									<button
										onClick={() => {
											set_delete_target(undefined)
											set_delete_confirm_name('')
										}}
										className={`ml-auto p-1 rounded-md ${is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} ${text_muted}`}
									>
										<X size={16} />
									</button>
								</div>
								<div
									className={`text-sm ${text_muted} p-3 rounded-lg border ${border_subtle} ${is_dark_mode ? 'bg-zinc-800/30' : 'bg-zinc-50'}`}
								>
									This will permanently delete <strong>{delete_target.name}</strong> and all its
									data. This action cannot be undone.
								</div>
								<input
									type="text"
									value={delete_confirm_name}
									onChange={(e) => set_delete_confirm_name(e.target.value)}
									placeholder={`Type "${delete_target.name}" to confirm`}
									className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all ${input_bg}`}
									autoFocus
								/>
								<div className="flex justify-end gap-3">
									<button
										onClick={() => {
											set_delete_target(undefined)
											set_delete_confirm_name('')
										}}
										className={`px-4 py-2 text-sm font-medium rounded-lg border ${btn_border} transition-colors`}
									>
										Cancel
									</button>
									<button
										onClick={handle_delete}
										disabled={is_deleting || !is_confirm_valid}
										className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
									>
										{is_deleting ? 'Deleting...' : 'Delete'}
									</button>
								</div>
							</div>
						</div>
					)
				})()}

			{duplicate_target &&
				(() => {
					const btn_border = is_dark_mode
						? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
						: 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
					return (
						<div
							className={`fixed inset-0 ${overlay_bg} flex items-center justify-center z-50`}
							onClick={() => set_duplicate_target(undefined)}
						>
							<div
								className={`w-full max-w-sm rounded-xl border p-6 space-y-4 ${bg_card}`}
								onClick={(e) => e.stopPropagation()}
							>
								<div className="flex items-center gap-3">
									<div
										className={`p-2 rounded-full ${is_dark_mode ? 'bg-blue-500/10' : 'bg-blue-50'}`}
									>
										<Copy size={18} className="text-blue-500" />
									</div>
									<div>
										<h3 className={`font-semibold ${text_heading}`}>Duplicate Dataset</h3>
										<p className={`text-xs ${text_muted} mt-0.5`}>
											Create a copy of &quot;{duplicate_target.name}&quot;
										</p>
									</div>
									<button
										onClick={() => set_duplicate_target(undefined)}
										className={`ml-auto p-1 rounded-md ${is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} ${text_muted}`}
									>
										<X size={16} />
									</button>
								</div>
								<p className={`text-sm ${text_muted}`}>
									A new dataset named &quot;{duplicate_target.name} (Copy)&quot; will be created in
									the same project. Image files can be added later.
								</p>
								<div className="flex justify-end gap-3">
									<button
										onClick={() => set_duplicate_target(undefined)}
										className={`px-4 py-2 text-sm font-medium rounded-lg border ${btn_border} transition-colors`}
									>
										Cancel
									</button>
									<button
										onClick={handle_duplicate}
										disabled={is_duplicating}
										className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
									>
										{is_duplicating ? 'Duplicating...' : 'Duplicate'}
									</button>
								</div>
							</div>
						</div>
					)
				})()}

			{toasts.length > 0 && (
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
			)}
		</main>
	)
}
