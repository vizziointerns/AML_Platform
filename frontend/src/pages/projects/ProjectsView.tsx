import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { use_project_store, type Project } from '../../store/projectStore'
import { use_app_context } from '../../contexts/app_context'
import { use_projects } from '../../hooks/use_projects'
import { supabase } from '../../utils/supabase'
import { Plus, Pin, AlertTriangle } from 'lucide-react'
import DeleteProjectDialog from '../../components/DeleteProjectDialog'
import { convert_tiff_to_png, tiff_data_url_to_file } from '../../utils/tiff'
import { project_card_grid } from './project_card'
import { project_card_list } from './project_list_item'
import { project_toolbar } from './project_toolbar'
import { rename_dialog } from './rename_dialog'

function toast_bar({
	toast,
	on_dismiss
}: {
	toast: { type: 'success' | 'error'; message: string }
	on_dismiss: () => void
}) {
	return (
		<div
			className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-in slide-in-from-bottom-4 duration-300 flex items-center gap-3 ${
				toast.type === 'success'
					? 'bg-emerald-900/90 border-emerald-700/50 text-emerald-200 backdrop-blur-sm'
					: 'bg-red-900/90 border-red-700/50 text-red-200 backdrop-blur-sm'
			}`}
			onClick={on_dismiss}
		>
			{toast.type === 'success' ? (
				<svg
					className="w-5 h-5 text-emerald-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
				</svg>
			) : (
				<AlertTriangle size={18} className="text-red-400 shrink-0" />
			)}
			{toast.message}
		</div>
	)
}

export default function projects_view() {
	const { is_dark_mode, open_new_project } = use_app_context()
	const { is_loading, error } = use_projects()
	const {
		projects,
		searchQuery: search_query,
		filterType: filter_type,
		sortBy: sort_by,
		setSearchQuery: set_search_query,
		setFilterType: set_filter_type,
		setSortBy: set_sort_by,
		togglePin: toggle_pin,
		duplicateProject: duplicate_project,
		updateProject: update_project
	} = use_project_store()

	const navigate = useNavigate()
	const file_input_ref = useRef<HTMLInputElement>(undefined!)
	const cover_project_id = useRef<string | undefined>(undefined)

	const [view_mode, set_view_mode] = useState<'grid' | 'list'>('grid')
	const [menu_open, set_menu_open] = useState<string | undefined>(undefined)

	const filtered = projects
		.filter(
			(p) =>
				(filter_type === 'All' || p.type === filter_type) &&
				p.name.toLowerCase().includes(search_query.toLowerCase())
		)
		.sort((a, b) =>
			sort_by === 'Name'
				? a.name.localeCompare(b.name)
				: sort_by === 'Progress'
					? b.annotationProgress - a.annotationProgress
					: sort_by === 'Oldest'
						? a.lastUpdated - b.lastUpdated
						: b.lastUpdated - a.lastUpdated
		)

	const pinned = filtered.filter((p) => p.isPinned)
	const unpinned = filtered.filter((p) => !p.isPinned)

	const render_card = (project: Project) => {
		const navigate_to = (id: string) => navigate(`/projects/${id}/dashboard`)
		const fn = view_mode === 'grid' ? project_card_grid : project_card_list
		return fn(
			project,
			is_dark_mode,
			menu_open,
			set_menu_open,
			navigate_to,
			duplicate_project,
			handle_rename_open,
			handle_add_cover,
			set_delete_target,
			handle_toggle_pin
		)
	}

	useEffect(() => {
		if (!menu_open) return
		const handler = () => set_menu_open(undefined)
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [menu_open])

	const [delete_target, set_delete_target] = useState<Project | undefined>(undefined)
	const [toast, set_toast] = useState<{ type: 'success' | 'error'; message: string } | undefined>(
		undefined
	)
	const [rename_target, set_rename_target] = useState<Project | undefined>(undefined)
	const [rename_name, set_rename_name] = useState('')

	useEffect(() => {
		if (!toast) return
		const timer = setTimeout(() => set_toast(undefined), 4000)
		return () => clearTimeout(timer)
	}, [toast])

	const show_toast = (message: string, type: 'success' | 'error' = 'success') => {
		set_toast({ type, message })
	}

	const handle_rename_open = (project: Project) => {
		set_rename_target(project)
		set_rename_name(project.name)
		set_menu_open(undefined)
	}

	const handle_rename_save = async () => {
		if (!rename_target || !rename_name.trim()) return
		const new_name = rename_name.trim()
		const { error: rename_err } = await supabase
			.from('projects')
			.update({ name: new_name })
			.eq('id', rename_target.id)
		if (rename_err) {
			show_toast(`Failed to rename: ${rename_err.message}`, 'error')
			return
		}
		update_project(rename_target.id, { name: new_name })
		set_rename_target(undefined)
		show_toast(`Project renamed to "${new_name}"`)
	}

	const handle_toggle_pin = async (id: string) => {
		const project = projects.find((p) => p.id === id)
		if (!project) return
		const is_new_pinned = !project.isPinned
		toggle_pin(id)
		const { error: pin_err } = await supabase
			.from('projects')
			.update({ is_pinned: is_new_pinned })
			.eq('id', id)
		if (pin_err) {
			toggle_pin(id)
			show_toast(`Failed to update pin: ${pin_err.message}`, 'error')
		}
	}

	const handle_add_cover = (project_id: string) => {
		cover_project_id.current = project_id
		file_input_ref.current?.click()
	}

	const handle_cover_upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file || !cover_project_id.current) return
		const pid = cover_project_id.current
		let file_to_upload: File = file
		const is_tiff = /\.tiff?$/i.test(file.name)
		if (is_tiff) {
			try {
				const png_data_url = await convert_tiff_to_png(file)
				file_to_upload = await tiff_data_url_to_file(png_data_url, file.name)
			} catch {
				show_toast('Failed to convert TIFF cover to PNG', 'error')
				e.target.value = ''
				cover_project_id.current = undefined
				return
			}
		}
		const file_path = `${pid}/${Date.now()}-${file_to_upload.name}`
		const { error: upload_err } = await supabase.storage
			.from('project-covers')
			.upload(file_path, file_to_upload)
		if (upload_err) {
			show_toast(`Failed to upload cover: ${upload_err.message}`, 'error')
			e.target.value = ''
			cover_project_id.current = undefined
			return
		}
		const {
			data: { publicUrl: public_url }
		} = supabase.storage.from('project-covers').getPublicUrl(file_path)
		const { error: db_err } = await supabase
			.from('projects')
			.update({ thumbnail: public_url })
			.eq('id', pid)
		if (db_err) {
			show_toast(`Failed to save cover: ${db_err.message}`, 'error')
			e.target.value = ''
			cover_project_id.current = undefined
			return
		}
		update_project(pid, { thumbnail: public_url })
		show_toast('Cover photo added')
		e.target.value = ''
		cover_project_id.current = undefined
	}

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'

	const render_sections = () => {
		const grid_class =
			view_mode === 'grid'
				? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
				: 'space-y-2'
		const margin_class = view_mode === 'grid' ? 'mb-8' : 'mb-4'
		const pad_class = view_mode === 'list' ? 'px-1' : ''

		return (
			<>
				{pinned.length > 0 && (
					<div className={margin_class}>
						<div className={`flex items-center gap-2 mb-3 ${pad_class}`}>
							<Pin size={14} className="text-yellow-500" />
							<h3 className={`text-xs font-semibold uppercase tracking-wider ${text_muted}`}>
								Pinned · {pinned.length}
							</h3>
						</div>
						<div className={grid_class}>{pinned.map(render_card)}</div>
					</div>
				)}
				{unpinned.length > 0 && (
					<div>
						{pinned.length > 0 && (
							<div className={`flex items-center gap-2 mb-3 ${pad_class}`}>
								<h3 className={`text-xs font-semibold uppercase tracking-wider ${text_muted}`}>
									All Projects · {unpinned.length}
								</h3>
							</div>
						)}
						<div className={grid_class}>{unpinned.map(render_card)}</div>
					</div>
				)}
			</>
		)
	}

	return (
		<>
			<div className="p-6 space-y-6">
				<div className="flex items-center justify-between">
					<h1 className={`text-2xl font-bold ${text_heading}`}>Projects</h1>
					<button
						onClick={open_new_project}
						className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
					>
						<Plus size={16} /> New Project
					</button>
				</div>

				{project_toolbar({
					search_query,
					on_search_change: set_search_query,
					filter_type,
					on_filter_change: set_filter_type,
					sort_by,
					on_sort_change: set_sort_by,
					view_mode,
					on_view_mode_change: set_view_mode,
					text_heading,
					text_muted,
					border_subtle,
					bg_card
				})}

				{is_loading ? (
					<div className="text-center py-20">
						<div className="loading-spinner mx-auto" />
						<p className={`text-sm mt-4 ${text_muted}`}>Loading projects...</p>
					</div>
				) : error ? (
					<div className={`rounded-xl border ${border_subtle} ${bg_card} p-12 text-center`}>
						<p className="text-sm text-red-500">{error}</p>
					</div>
				) : filtered.length === 0 ? (
					<div className={`rounded-xl border ${border_subtle} ${bg_card} p-12 text-center`}>
						<p className={`text-sm ${text_muted}`}>
							{projects.length === 0
								? 'No projects yet. Create your first project to get started.'
								: 'No projects match your search.'}
						</p>
						{projects.length === 0 && (
							<button
								onClick={open_new_project}
								className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
							>
								<Plus size={16} /> Create Project
							</button>
						)}
					</div>
				) : (
					render_sections()
				)}
			</div>

			<input
				type="file"
				ref={file_input_ref}
				accept="image/*,.tif,.tiff"
				onChange={handle_cover_upload}
				hidden
			/>

			{rename_dialog({
				target: rename_target,
				name: rename_name,
				on_name_change: set_rename_name,
				on_save: handle_rename_save,
				on_close: () => set_rename_target(undefined),
				is_dark_mode
			})}

			{toast && toast_bar({ toast, on_dismiss: () => set_toast(undefined) })}

			<DeleteProjectDialog
				delete_target={delete_target}
				on_close={() => set_delete_target(undefined)}
				on_success={(name) => show_toast(`"${name}" has been deleted.`)}
				is_dark_mode={is_dark_mode}
			/>
		</>
	)
}
