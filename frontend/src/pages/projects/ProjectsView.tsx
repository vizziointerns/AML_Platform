import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { use_project_store, type Project, type ProjectType } from '../../store/projectStore'
import { use_app_context } from '../../contexts/app_context'
import { use_projects } from '../../hooks/use_projects'
import { supabase } from '../../utils/supabase'
import {
	Search,
	Plus,
	LayoutGrid,
	List as ListIcon,
	MoreVertical,
	Pin,
	Clock,
	AlertTriangle,
	Pencil,
	Copy,
	ImagePlus,
	Trash2,
	Crosshair,
	Shapes,
	Tags,
	ScanLine,
	FileText,
	Video,
	Box
} from 'lucide-react'
import DeleteProjectDialog from '../../components/DeleteProjectDialog'
import { generate_tiff_preview, tiff_data_url_to_file } from '../../utils/tiff'

const TYPE_ICON: Record<string, typeof Crosshair> = {
	'Object Detection': ScanLine,
	'Semantic Segmentation': Shapes,
	'Instance Segmentation': Shapes,
	Classification: Tags,
	'Keypoint Detection': Crosshair,
	OCR: FileText,
	'Video Tracking': Video,
	'3D Vision': Box
}
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

function rename_dialog({
	target,
	name,
	on_name_change,
	on_save,
	on_close,
	is_dark_mode
}: {
	target: Project | undefined
	name: string
	on_name_change: (v: string) => void
	on_save: () => void
	on_close: () => void
	is_dark_mode: boolean
}) {
	if (!target) return undefined
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'

	return (
		<>
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
				onClick={on_close}
			/>
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
				<div
					className={`pointer-events-auto w-full max-w-sm rounded-xl shadow-2xl border ${border_subtle} ${bg_card} animate-in zoom-in-95 duration-300`}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault()
							on_save()
						}
					}}
				>
					<div className={`px-5 py-4 border-b ${border_subtle}`}>
						<h3 className={`font-semibold ${text_heading}`}>Rename Project</h3>
					</div>
					<div className="px-5 py-4 space-y-3">
						<label className={`text-sm font-medium ${text_heading}`}>Project Name</label>
						<input
							type="text"
							value={name}
							onChange={(e) => on_name_change(e.target.value)}
							autoFocus
							className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${border_subtle} ${is_dark_mode ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'} focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50`}
						/>
					</div>
					<div
						className={`px-5 py-4 border-t ${border_subtle} ${bg_subtle} rounded-b-xl flex justify-end gap-3`}
					>
						<button
							onClick={on_close}
							className={`px-4 py-2 text-sm font-medium rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors ${text_heading}`}
						>
							Cancel
						</button>
						<button
							onClick={on_save}
							disabled={!name.trim()}
							className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Save
						</button>
					</div>
				</div>
			</div>
		</>
	)
}

function project_card_cover(
	project: Project,
	is_dark_mode: boolean,
	menu_open: string | undefined,
	on_menu_toggle: (id: string | undefined) => void,
	on_rename: (p: Project) => void,
	on_duplicate: (id: string) => void,
	on_add_cover: (id: string) => void,
	on_delete: (p: Project) => void
) {
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const cover_class = is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'
	const ICON_COMP = TYPE_ICON[project.type]
	const dot_color = is_dark_mode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'
	const icon_color = is_dark_mode ? 'text-white/30' : 'text-black/20'

	return (
		<div className={`h-32 relative ${cover_class}`}>
			{project.thumbnail ? (
				<img src={project.thumbnail} alt="" className="w-full h-full object-cover" />
			) : (
				<div
					className="w-full h-full flex items-center justify-center"
					style={{
						background: `radial-gradient(circle, ${dot_color} 1px, transparent 1px)`,
						backgroundSize: '16px 16px'
					}}
				>
					{ICON_COMP && <ICON_COMP size={48} className={icon_color} strokeWidth={1.5} />}
				</div>
			)}
			<div className="absolute top-2 right-2">
				<button
					onClick={(e) => {
						e.stopPropagation()
						on_menu_toggle(menu_open === project.id ? undefined : project.id)
					}}
					className={`p-1.5 rounded-lg bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-colors text-white`}
				>
					<MoreVertical size={16} />
				</button>
				{menu_open === project.id && (
					<div
						className={`absolute right-0 top-10 w-44 rounded-lg border shadow-xl z-10 py-1 ${border_subtle} ${bg_card}`}
						onClick={(e) => e.stopPropagation()}
					>
						<button
							onClick={() => on_rename(project)}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${text_heading} flex items-center gap-2`}
						>
							<Pencil size={14} /> Rename
						</button>
						<button
							onClick={() => {
								on_duplicate(project.id)
								on_menu_toggle(undefined)
							}}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${text_heading} flex items-center gap-2`}
						>
							<Copy size={14} /> Duplicate
						</button>
						<button
							onClick={() => {
								on_add_cover(project.id)
								on_menu_toggle(undefined)
							}}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${text_heading} flex items-center gap-2`}
						>
							<ImagePlus size={14} /> Add Cover Photo
						</button>
						<button
							onClick={(e) => {
								e.stopPropagation()
								e.preventDefault()
								on_delete(project)
								on_menu_toggle(undefined)
							}}
							className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
						>
							<Trash2 size={14} /> Delete
						</button>
					</div>
				)}
			</div>
		</div>
	)
}

function project_card_grid(
	project: Project,
	is_dark_mode: boolean,
	menu_open: string | undefined,
	on_menu_toggle: (id: string | undefined) => void,
	on_navigate: (id: string) => void,
	on_duplicate: (id: string) => void,
	on_rename: (p: Project) => void,
	on_add_cover: (id: string) => void,
	on_delete: (p: Project) => void,
	on_toggle_pin: (id: string) => void
) {
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'

	return (
		<div
			key={project.id}
			onClick={() => on_navigate(project.id)}
			className={`rounded-xl border ${border_subtle} ${bg_card} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative cursor-pointer overflow-hidden`}
		>
			{project_card_cover(
				project,
				is_dark_mode,
				menu_open,
				on_menu_toggle,
				on_rename,
				on_duplicate,
				on_add_cover,
				on_delete
			)}

			<div className="p-4">
				<div className="flex items-center gap-3 mb-3">
					<div
						className={`w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold shrink-0 ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'} ${text_heading}`}
					>
						{project.name[0]}
					</div>
					<div className="min-w-0 flex-1">
						<h3 className={`font-medium text-sm truncate ${text_heading}`}>{project.name}</h3>
						<span className={`text-xs ${text_muted}`}>{project.type}</span>
					</div>
				</div>

				<div className="space-y-2">
					<div className="flex justify-between text-xs">
						<span className={text_muted}>{project.datasetCount} images</span>
						<span className={text_muted}>{project.annotationProgress}% annotated</span>
					</div>
					<div
						className={`h-1.5 rounded-full overflow-hidden ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
					>
						<div
							className="h-full bg-blue-500 rounded-full transition-all"
							style={{ width: `${project.annotationProgress}%` }}
						/>
					</div>
				</div>

				<div className="flex items-center justify-between mt-3 pt-3 border-t">
					<div className="flex items-center gap-2 text-xs">
						<Clock size={12} className={text_muted} />
						<span className={text_muted}>{new Date(project.lastUpdated).toLocaleDateString()}</span>
					</div>
					<button
						onClick={(e) => {
							e.stopPropagation()
							on_toggle_pin(project.id)
						}}
						className={`p-1 rounded ${project.isPinned ? 'text-yellow-500' : text_muted}`}
					>
						<Pin size={14} />
					</button>
				</div>
			</div>
		</div>
	)
}

function project_card_list(
	project: Project,
	is_dark_mode: boolean,
	menu_open: string | undefined,
	on_menu_toggle: (id: string | undefined) => void,
	on_navigate: (id: string) => void,
	on_duplicate: (id: string) => void,
	on_rename: (p: Project) => void,
	on_add_cover: (id: string) => void,
	on_delete: (p: Project) => void,
	on_toggle_pin: (id: string) => void
) {
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'

	return (
		<div
			key={project.id}
			onClick={() => on_navigate(project.id)}
			className={`rounded-xl border ${border_subtle} ${bg_card} p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/30 relative cursor-pointer flex items-center gap-4`}
		>
			<div
				className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0 ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'} ${text_heading}`}
			>
				{project.name[0]}
			</div>
			<div className="flex-1 min-w-0">
				<h3 className={`font-medium text-sm truncate ${text_heading}`}>{project.name}</h3>
				<span className={`text-xs ${text_muted}`}>{project.type}</span>
			</div>
			<div className="flex items-center gap-4 text-xs shrink-0">
				<div className="flex items-center gap-2">
					<div className="flex flex-col items-end gap-1">
						<span className={text_muted}>{project.datasetCount} images</span>
						<span className={text_muted}>{project.annotationProgress}% annotated</span>
					</div>
					<div
						className={`w-20 h-1.5 rounded-full overflow-hidden ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
					>
						<div
							className="h-full bg-blue-500 rounded-full transition-all"
							style={{ width: `${project.annotationProgress}%` }}
						/>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Clock size={12} className={text_muted} />
					<span className={text_muted}>{new Date(project.lastUpdated).toLocaleDateString()}</span>
				</div>
			</div>
			<button
				onClick={(e) => {
					e.stopPropagation()
					on_toggle_pin(project.id)
				}}
				className={`p-1 rounded ${project.isPinned ? 'text-yellow-500' : text_muted}`}
			>
				<Pin size={14} />
			</button>
			<div className="relative">
				<button
					onClick={(e) => {
						e.stopPropagation()
						on_menu_toggle(menu_open === project.id ? undefined : project.id)
					}}
					className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/50`}
				>
					<MoreVertical size={16} className={text_muted} />
				</button>
				{menu_open === project.id && (
					<div
						className={`absolute right-0 top-8 w-44 rounded-lg border shadow-xl z-10 py-1 ${border_subtle} ${bg_card}`}
						onClick={(e) => e.stopPropagation()}
					>
						<button
							onClick={() => on_rename(project)}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${text_heading} flex items-center gap-2`}
						>
							<Pencil size={14} /> Rename
						</button>
						<button
							onClick={() => {
								on_duplicate(project.id)
								on_menu_toggle(undefined)
							}}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${text_heading} flex items-center gap-2`}
						>
							<Copy size={14} /> Duplicate
						</button>
						<button
							onClick={() => {
								on_add_cover(project.id)
								on_menu_toggle(undefined)
							}}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${text_heading} flex items-center gap-2`}
						>
							<ImagePlus size={14} /> Add Cover Photo
						</button>
						<button
							onClick={(e) => {
								e.stopPropagation()
								e.preventDefault()
								on_delete(project)
								on_menu_toggle(undefined)
							}}
							className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
						>
							<Trash2 size={14} /> Delete
						</button>
					</div>
				)}
			</div>
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

	const handle_toggle_pin = (id: string) => {
		const project = projects.find((p) => p.id === id)
		if (!project) return
		const is_new_pinned = !project.isPinned
		toggle_pin(id)
		supabase.from('projects').update({ is_pinned: is_new_pinned }).eq('id', id)
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
			const preview_url = await generate_tiff_preview(file)
			if (preview_url) {
				file_to_upload = await tiff_data_url_to_file(preview_url, file.name)
			}
		}
		const file_path = `${pid}/${Date.now()}-${file_to_upload.name}`
		const { error: upload_err } = await supabase.storage
			.from('project-covers')
			.upload(file_path, file_to_upload)
		if (upload_err) {
			show_toast(`Failed to upload cover: ${upload_err.message}`, 'error')
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
			return
		}
		update_project(pid, { thumbnail: public_url })
		show_toast('Cover photo added')
		e.target.value = ''
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

				<div className="flex items-center gap-3 flex-wrap">
					<div className="relative flex-1 min-w-[200px]">
						<Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
						<input
							type="text"
							placeholder="Search projects..."
							value={search_query}
							onChange={(e) => set_search_query(e.target.value)}
							className={`w-full pl-9 pr-4 py-2 rounded-lg border ${border_subtle} ${bg_card} ${text_heading} text-sm outline-none focus:ring-2 focus:ring-blue-500/50`}
						/>
					</div>
					<select
						value={filter_type}
						onChange={(e) => set_filter_type(e.target.value as ProjectType | 'All')}
						className={`px-3 py-2 rounded-lg border ${border_subtle} ${bg_card} ${text_heading} text-sm outline-none`}
					>
						<option value="All">All Types</option>
						<option value="Object Detection">Object Detection</option>
						<option value="Semantic Segmentation">Semantic Segmentation</option>
						<option value="Classification">Classification</option>
					</select>
					<select
						value={sort_by}
						onChange={(e) =>
							set_sort_by(e.target.value as 'Updated' | 'Name' | 'Progress' | 'Oldest')
						}
						className={`px-3 py-2 rounded-lg border ${border_subtle} ${bg_card} ${text_heading} text-sm outline-none`}
					>
						<option value="Updated">Last Updated</option>
						<option value="Name">Name</option>
						<option value="Progress">Progress</option>
						<option value="Oldest">Oldest</option>
					</select>
					<div className={`flex ${border_subtle} rounded-lg overflow-hidden`}>
						<button
							onClick={() => set_view_mode('grid')}
							className={`px-3 py-2 ${view_mode === 'grid' ? 'bg-blue-600 text-white' : text_muted}`}
						>
							<LayoutGrid size={16} />
						</button>
						<button
							onClick={() => set_view_mode('list')}
							className={`px-3 py-2 ${view_mode === 'list' ? 'bg-blue-600 text-white' : text_muted}`}
						>
							<ListIcon size={16} />
						</button>
					</div>
				</div>

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
