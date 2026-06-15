import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { use_project_store } from '../../store/projectStore'
import { use_app_context } from '../../contexts/app_context'
import { use_projects } from '../../hooks/use_projects'
import { pin_button as PinButton } from '../../components/RecentProjectCard/PinButton'
import { duplicate_button as DuplicateButton } from '../../components/RecentProjectCard/DuplicateButton'
import { delete_modal as DeleteModal } from '../../components/RecentProjectCard/DeleteModal'
import { rename_modal as RenameModal } from '../../components/RecentProjectCard/RenameModal'
import { search_bar as SearchBar } from '../../components/SearchBar'
import { pinned_projects_section as PinnedProjectsSection } from '../../components/PinnedProjectsSection'
import { filter_bar } from '../../components/FilterBar'
import { cover_image_uploader as CoverImageUploader } from '../../components/CoverImageUploader'
import { Plus, LayoutGrid, List as ListIcon, Clock, Trash2, Pencil, ImageIcon } from 'lucide-react'

function dispatch_toast(message: string, type: 'success' | 'error' = 'success') {
	window.dispatchEvent(new CustomEvent('project-toast', { detail: { message, type } }))
}

function project_card(
	project: import('../../store/projectStore').Project,
	on_navigate: (id: string) => void,
	on_pin: (id: string) => void,
	on_duplicate: (id: string) => void,
	on_delete_click: (id: string, name: string) => void,
	on_rename_click: (id: string, name: string) => void,
	on_change_cover: (id: string) => void,
	is_dark_mode: boolean,
	text_heading: string,
	text_muted: string,
	border_subtle: string,
	bg_card: string
) {
	const status_colors: Record<string, string> = {
		Active: 'bg-emerald-500/10 text-emerald-500',
		Draft: 'bg-zinc-500/10 text-zinc-500',
		Completed: 'bg-blue-500/10 text-blue-500',
		Archived: 'bg-amber-500/10 text-amber-500'
	}

	return (
		<div
			key={project.id}
			onClick={() => on_navigate(project.id)}
			className={`rounded-xl border ${border_subtle} ${bg_card} hover:shadow-lg transition-all group overflow-hidden cursor-pointer`}
		>
			{project.coverImageUrl ? (
				<div className="relative h-28 overflow-hidden">
					<img
						src={project.coverImageUrl}
						alt={project.name}
						className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
					<button
						onClick={(e) => {
							e.stopPropagation()
							on_change_cover(project.id)
						}}
						className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
						title="Change cover image"
					>
						<ImageIcon size={20} className="text-white" />
					</button>
				</div>
			) : (
				<div
					className={`h-28 ${is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-100'} flex items-center justify-center relative group`}
				>
					<div
						className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold ${is_dark_mode ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-700'}`}
					>
						{project.name[0]}
					</div>
					<button
						onClick={(e) => {
							e.stopPropagation()
							on_change_cover(project.id)
						}}
						className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl"
						title="Set cover image"
					>
						<ImageIcon size={20} className="text-white" />
					</button>
				</div>
			)}

			<div className="p-4">
				<div className="flex items-start justify-between gap-2">
					<h3 className={`font-medium text-sm truncate ${text_heading}`}>{project.name}</h3>
					<span
						className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
							status_colors[project.status] ?? 'bg-zinc-500/10 text-zinc-500'
						}`}
					>
						{project.status}
					</span>
				</div>
				<span className={`text-xs ${text_muted}`}>{project.type}</span>

				<div className="space-y-2 mt-3">
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

				<div className={`flex items-center justify-between mt-3 pt-3 border-t ${border_subtle}`}>
					<div className="flex items-center gap-2 text-xs">
						<Clock size={12} className={text_muted} />
						<span className={text_muted}>{new Date(project.lastUpdated).toLocaleDateString()}</span>
					</div>
					<div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
						<PinButton
							is_pinned={project.isPinned}
							is_dark_mode={is_dark_mode}
							on_toggle={() => on_pin(project.id)}
						/>
						<button
							onClick={() => on_rename_click(project.id, project.name)}
							className={`p-1.5 rounded-md ${text_muted} hover:text-blue-500 ${is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} transition-colors`}
							title="Rename project"
						>
							<Pencil size={14} />
						</button>
						<DuplicateButton
							project_id={project.id}
							on_duplicate={on_duplicate}
							is_dark_mode={is_dark_mode}
						/>
						<button
							onClick={() => on_delete_click(project.id, project.name)}
							className={`p-1.5 rounded-md ${text_muted} hover:text-red-500 ${is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} transition-colors`}
							title="Delete project"
						>
							<Trash2 size={14} />
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

function filter_project(
	p: import('../../store/projectStore').Project,
	project_type_filters: import('../../store/projectStore').ProjectType[],
	search_query: string
): boolean {
	const is_type_match = project_type_filters.length === 0 || project_type_filters.includes(p.type)
	const is_search_match = p.name.toLowerCase().includes(search_query.toLowerCase())
	return is_type_match && is_search_match
}

function sort_by_date(
	projects: import('../../store/projectStore').Project[],
	sort_order: 'newest' | 'oldest'
) {
	return [...projects].sort((a, b) =>
		sort_order === 'newest' ? b.lastUpdated - a.lastUpdated : a.lastUpdated - b.lastUpdated
	)
}

function render_project_list({
	is_loading,
	error,
	projects,
	unpinned_filtered,
	pinned_filtered,
	view_mode,
	open_new_project,
	navigate,
	handle_pin,
	handle_duplicate,
	set_delete_target,
	on_rename_click,
	set_cover_upload_target,
	is_dark_mode,
	text_heading,
	text_muted,
	border_subtle,
	bg_card
}: {
	is_loading: boolean
	error: string | undefined
	projects: import('../../store/projectStore').Project[]
	unpinned_filtered: import('../../store/projectStore').Project[]
	pinned_filtered: import('../../store/projectStore').Project[]
	view_mode: 'grid' | 'list'
	open_new_project: () => void
	navigate: ReturnType<typeof useNavigate>
	handle_pin: (id: string) => Promise<void>
	handle_duplicate: (id: string) => Promise<void>
	set_delete_target: (target: { id: string; name: string } | undefined) => void
	on_rename_click: (id: string, name: string) => void
	set_cover_upload_target: (id: string) => void
	is_dark_mode: boolean
	text_heading: string
	text_muted: string
	border_subtle: string
	bg_card: string
}) {
	return is_loading ? (
		<div className="text-center py-20">
			<div className="loading-spinner mx-auto" />
			<p className={`text-sm mt-4 ${text_muted}`}>Loading projects...</p>
		</div>
	) : error ? (
		<div className={`rounded-xl border ${border_subtle} ${bg_card} p-12 text-center`}>
			<p className="text-sm text-red-500">{error}</p>
		</div>
	) : projects.length === 0 ? (
		<div className={`rounded-xl border ${border_subtle} ${bg_card} p-12 text-center`}>
			<p className={`text-sm ${text_muted}`}>
				No projects yet. Create your first project to get started.
			</p>
			<button
				onClick={open_new_project}
				className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
			>
				<Plus size={16} /> Create Project
			</button>
		</div>
	) : unpinned_filtered.length === 0 ? (
		<div className={`rounded-xl border ${border_subtle} ${bg_card} p-12 text-center`}>
			<p className={`text-sm ${text_muted}`}>
				{pinned_filtered.length > 0
					? 'All projects are pinned. Unpin some to see them here.'
					: 'No projects match your search.'}
			</p>
		</div>
	) : (
		<div
			className={
				view_mode === 'grid'
					? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
					: 'space-y-2'
			}
		>
			{unpinned_filtered.map((p) =>
				project_card(
					p,
					(id) => navigate(`/projects/${id}/dashboard`),
					handle_pin,
					handle_duplicate,
					(id, name) => set_delete_target({ id, name }),
					(id, name) => on_rename_click(id, name),
					set_cover_upload_target,
					is_dark_mode,
					text_heading,
					text_muted,
					border_subtle,
					bg_card
				)
			)}
		</div>
	)
}

export default function projects_view() {
	const { is_dark_mode, open_new_project } = use_app_context()
	const { is_loading, error } = use_projects()
	const {
		projects,
		searchQuery: search_query,
		project_type_filters,
		sort_order,
		setSearchQuery: set_search_query,
		set_project_type_filters,
		set_sort_order,
		clear_filters,
		togglePin: toggle_pin,
		deleteProject: delete_project,
		duplicateProject: duplicate_project,
		renameProject: rename_project,
		updateProjectCover: update_project_cover
	} = use_project_store()

	const navigate = useNavigate()

	const [view_mode, set_view_mode] = useState<'grid' | 'list'>('grid')
	const [delete_target, set_delete_target] = useState<{ id: string; name: string } | undefined>(
		undefined
	)
	const [is_deleting, set_is_deleting] = useState(false)
	const [rename_target, set_rename_target] = useState<{ id: string; name: string } | undefined>(
		undefined
	)
	const [is_renaming, set_is_renaming] = useState(false)
	const [rename_error, set_rename_error] = useState<string | undefined>(undefined)
	const [cover_upload_target, set_cover_upload_target] = useState<string | undefined>(undefined)

	const pinned_filtered = useMemo(
		() =>
			projects.filter((p) => p.isPinned && filter_project(p, project_type_filters, search_query)),
		[projects, project_type_filters, search_query]
	)

	const unpinned_filtered = useMemo(
		() =>
			sort_by_date(
				projects.filter(
					(p) => !p.isPinned && filter_project(p, project_type_filters, search_query)
				),
				sort_order
			),
		[projects, project_type_filters, search_query, sort_order]
	)

	const handle_pin = useCallback(
		async (id: string) => {
			try {
				await toggle_pin(id)
			} catch {
				dispatch_toast('Failed to update pin status. Please try again.', 'error')
			}
		},
		[toggle_pin]
	)

	const handle_delete = useCallback(async () => {
		if (!delete_target) return
		set_is_deleting(true)
		try {
			await delete_project(delete_target.id)
			set_delete_target(undefined)
		} catch {
			dispatch_toast('Failed to delete project. Please try again.', 'error')
		} finally {
			set_is_deleting(false)
		}
	}, [delete_target, delete_project])

	const handle_rename_click = useCallback((id: string, name: string) => {
		set_rename_target({ id, name })
		set_rename_error(undefined)
	}, [])

	const handle_duplicate = useCallback(
		async (id: string) => {
			try {
				await duplicate_project(id)
				dispatch_toast('Project duplicated successfully.', 'success')
			} catch {
				dispatch_toast('Failed to duplicate project. Please try again.', 'error')
			}
		},
		[duplicate_project]
	)

	const handle_rename = useCallback(
		async (new_name: string) => {
			if (!rename_target) return
			const duplicate = projects.find(
				(p) => p.name.toLowerCase() === new_name.toLowerCase() && p.id !== rename_target.id
			)
			if (duplicate) {
				set_rename_error(
					`A project named "${new_name}" already exists. Please choose a different name.`
				)
				return
			}
			set_rename_error(undefined)
			set_is_renaming(true)
			try {
				await rename_project(rename_target.id, new_name)
				set_rename_target(undefined)
				dispatch_toast('Project renamed successfully.', 'success')
			} catch {
				dispatch_toast('Failed to rename project. Please try again.', 'error')
			}
			set_is_renaming(false)
		},
		[rename_target, rename_project, projects]
	)

	const theme = is_dark_mode
		? {
				heading: 'text-zinc-100',
				muted: 'text-zinc-400',
				border: 'border-zinc-800',
				card: 'bg-zinc-900'
			}
		: {
				heading: 'text-zinc-900',
				muted: 'text-zinc-500',
				border: 'border-zinc-200',
				card: 'bg-white'
			}
	const text_heading = theme.heading
	const text_muted = theme.muted
	const border_subtle = theme.border
	const bg_card = theme.card

	return (
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

			{/* Search bar — always at top, never moves when pinning/unpinning */}
			<SearchBar value={search_query} on_change={set_search_query} is_dark_mode={is_dark_mode} />

			{/* Pinned Projects — directly below search bar */}
			<PinnedProjectsSection count={pinned_filtered.length} is_dark_mode={is_dark_mode}>
				{is_loading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{Array.from({ length: 4 }, (_, i) => (
							<div
								key={i}
								className={`rounded-xl border ${border_subtle} ${bg_card} p-4 animate-pulse`}
							>
								<div
									className={`h-4 w-24 rounded ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
								/>
							</div>
						))}
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{pinned_filtered.map((p) =>
							project_card(
								p,
								(id) => navigate(`/projects/${id}/dashboard`),
								handle_pin,
								handle_duplicate,
								(id, name) => set_delete_target({ id, name }),
								handle_rename_click,
								set_cover_upload_target,
								is_dark_mode,
								text_heading,
								text_muted,
								border_subtle,
								bg_card
							)
						)}
					</div>
				)}
			</PinnedProjectsSection>

			{/* All Projects — toolbar + list */}
			{!is_loading && !error && projects.length > 0 && (
				<div className="space-y-4">
					<h2 className={`text-lg font-semibold tracking-tight ${text_heading}`}>All Projects</h2>
					<div className="flex items-center gap-3 flex-wrap">
						{filter_bar({
							sort_order,
							project_type_filters,
							on_sort_order_change: set_sort_order,
							on_project_type_filters_change: set_project_type_filters,
							on_clear: clear_filters,
							is_dark_mode
						})}
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
				</div>
			)}

			{render_project_list({
				is_loading,
				error,
				projects,
				unpinned_filtered,
				pinned_filtered,
				view_mode,
				open_new_project,
				navigate,
				handle_pin,
				handle_duplicate,
				set_delete_target,
				on_rename_click: handle_rename_click,
				set_cover_upload_target,
				is_dark_mode,
				text_heading,
				text_muted,
				border_subtle,
				bg_card
			})}

			{delete_target && (
				<DeleteModal
					project_name={delete_target.name}
					is_dark_mode={is_dark_mode}
					is_loading={is_deleting}
					on_confirm={handle_delete}
					on_cancel={() => set_delete_target(undefined)}
				/>
			)}

			{rename_target && (
				<RenameModal
					project_name={rename_target.name}
					is_dark_mode={is_dark_mode}
					is_loading={is_renaming}
					error={rename_error}
					on_confirm={handle_rename}
					on_cancel={() => {
						set_rename_target(undefined)
						set_rename_error(undefined)
					}}
				/>
			)}

			{cover_upload_target && (
				<CoverImageUploader
					project_id={cover_upload_target}
					current_url={projects.find((p) => p.id === cover_upload_target)?.coverImageUrl}
					is_dark_mode={is_dark_mode}
					on_save={async (url) => {
						await update_project_cover(cover_upload_target, url)
					}}
					on_close={() => set_cover_upload_target(undefined)}
				/>
			)}
		</div>
	)
}
