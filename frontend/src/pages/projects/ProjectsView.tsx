import { useState, useEffect, useCallback, useMemo } from 'react'
import { use_project_store, type ProjectType } from '../../store/projectStore'
import { use_app_context } from '../../contexts/app_context'
import { use_auth } from '../../contexts/auth_context'
import { use_projects } from '../../hooks/use_projects'
import { delete_modal } from '../../components/DeleteModal/index'
import { rename_modal } from '../../components/RenameModal/index'
import { upload_cover_image, delete_cover_image } from '../../utils/storage'
import {
	update_cover_image_in_db,
	remove_cover_image_from_db,
	delete_project_from_db,
	rename_project_in_db,
	duplicate_project_in_db
} from '../../api/projects'
import { pinned_projects_section as PinnedProjectsSection } from '../../components/PinnedProjectsSection/index'
import ProjectCard from '../../components/ProjectCard/index'
import { Search, Plus, LayoutGrid, List as ListIcon } from 'lucide-react'

function render_delete_modal(
	delete_target: { id: string; name: string } | undefined,
	on_close: () => void,
	on_confirm: () => Promise<void>,
	is_dark_mode: boolean,
	is_deleting: boolean,
	toast: { message: string; type: 'success' | 'error' } | undefined
) {
	return (
		<>
			{delete_modal({
				is_open: delete_target !== undefined,
				project_name: delete_target?.name ?? '',
				on_close,
				on_confirm,
				is_dark_mode,
				is_deleting
			})}
			{toast && (
				<div
					className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium animate-in slide-in-from-bottom-2 duration-300 ${
						toast.type === 'success'
							? 'bg-emerald-600 text-white border-emerald-500'
							: 'bg-red-600 text-white border-red-500'
					}`}
				>
					{toast.message}
				</div>
			)}
		</>
	)
}

function render_rename_modal(
	rename_target: { id: string; name: string } | undefined,
	on_close: () => void,
	on_confirm: (new_name: string) => Promise<void>,
	is_dark_mode: boolean,
	is_renaming: boolean,
	existing_names: string[]
) {
	return rename_modal({
		is_open: rename_target !== undefined,
		current_name: rename_target?.name ?? '',
		existing_names,
		on_close,
		on_confirm,
		is_dark_mode,
		is_saving: is_renaming
	})
}

export default function projects_view() {
	const { is_dark_mode, open_new_project } = use_app_context()
	const { user } = use_auth()
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
		deleteProject: delete_project,
		addProject: add_project,
		updateProject: update_project
	} = use_project_store()

	const [view_mode, set_view_mode] = useState<'grid' | 'list'>('grid')
	const [delete_target, set_delete_target] = useState<{ id: string; name: string } | undefined>()
	const [is_deleting, set_is_deleting] = useState(false)
	const [rename_target, set_rename_target] = useState<{ id: string; name: string } | undefined>()
	const [is_renaming, set_is_renaming] = useState(false)
	const [toast, set_toast] = useState<{ message: string; type: 'success' | 'error' } | undefined>()

	const filtered_all = useMemo(
		() =>
			projects
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
				),
		[projects, search_query, filter_type, sort_by]
	)

	const pinned_filtered = useMemo(() => filtered_all.filter((p) => p.isPinned), [filtered_all])

	const unpinned_filtered = useMemo(() => filtered_all.filter((p) => !p.isPinned), [filtered_all])

	const handle_delete_confirm = useCallback(async () => {
		if (!delete_target) return
		set_is_deleting(true)
		try {
			await delete_cover_image(delete_target.id)
			await delete_project_from_db(delete_target.id)
			delete_project(delete_target.id)
			set_delete_target(undefined)
			set_toast({ message: 'Project deleted successfully.', type: 'success' })
		} catch {
			set_toast({ message: 'Failed to delete project. Please try again.', type: 'error' })
		} finally {
			set_is_deleting(false)
		}
	}, [delete_target, delete_project])

	const handle_rename_confirm = useCallback(
		async (new_name: string) => {
			if (!rename_target) return
			set_is_renaming(true)
			try {
				await rename_project_in_db(rename_target.id, new_name)
				update_project(rename_target.id, { name: new_name })
				set_rename_target(undefined)
				set_toast({ message: 'Project renamed successfully.', type: 'success' })
			} catch {
				set_toast({ message: 'Failed to rename project. Please try again.', type: 'error' })
			} finally {
				set_is_renaming(false)
			}
		},
		[rename_target, update_project]
	)

	const handle_upload_cover = useCallback(
		async (id: string, file: File) => {
			try {
				const url = await upload_cover_image(file, id)
				await update_cover_image_in_db(id, url)
				update_project(id, { coverImageUrl: url })
				set_toast({ message: 'Cover photo updated.', type: 'success' })
			} catch (e) {
				console.error('Upload cover failed:', e)
				set_toast({ message: 'Failed to upload cover photo.', type: 'error' })
			}
		},
		[update_project]
	)

	const handle_duplicate = useCallback(
		async (id: string) => {
			if (!user) return
			try {
				const new_project = await duplicate_project_in_db(id, user.id)
				if (new_project) {
					add_project(new_project)
				}
				set_toast({ message: 'Project duplicated successfully.', type: 'success' })
			} catch {
				set_toast({ message: 'Failed to duplicate project. Please try again.', type: 'error' })
			}
		},
		[user, add_project]
	)

	const handle_remove_cover = useCallback(
		async (id: string) => {
			try {
				await delete_cover_image(id)
				await remove_cover_image_from_db(id)
				update_project(id, { coverImageUrl: '' })
				set_toast({ message: 'Cover photo removed.', type: 'success' })
			} catch (e) {
				console.error('Remove cover failed:', e)
				set_toast({ message: 'Failed to remove cover photo.', type: 'error' })
			}
		},
		[update_project]
	)

	useEffect(() => {
		if (!toast) return undefined
		const timer = setTimeout(() => set_toast(undefined), 3000)
		return () => clearTimeout(timer)
	}, [toast])

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'

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
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500 mx-auto" />
					<p className={`text-sm mt-4 ${text_muted}`}>Loading projects...</p>
				</div>
			) : error ? (
				<div className={`rounded-xl border ${border_subtle} ${bg_card} p-12 text-center`}>
					<p className="text-sm text-red-500">{error}</p>
				</div>
			) : (
				<>
					<PinnedProjectsSection
						projects={pinned_filtered}
						is_dark_mode={is_dark_mode}
						on_pin_toggle={toggle_pin}
					/>

					<div>
						<div className="flex items-center justify-between mb-4">
							<h2 className={`text-sm font-semibold ${text_heading}`}>All Projects</h2>
							<span className={`text-xs ${text_muted}`}>{unpinned_filtered.length} projects</span>
						</div>

						{unpinned_filtered.length === 0 &&
						pinned_filtered.length === 0 &&
						projects.length === 0 ? (
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
								<p className={`text-sm ${text_muted}`}>No projects match your search.</p>
							</div>
						) : (
							<div
								className={
									view_mode === 'grid'
										? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
										: 'space-y-2'
								}
							>
								{unpinned_filtered.map((project) => (
									<ProjectCard
										key={project.id}
										project={project}
										is_dark_mode={is_dark_mode}
										on_pin_toggle={toggle_pin}
										on_rename={(id, name) => set_rename_target({ id, name })}
										on_duplicate={handle_duplicate}
										on_delete={(id, name) => set_delete_target({ id, name })}
										on_upload_cover={handle_upload_cover}
										on_remove_cover={handle_remove_cover}
									/>
								))}
							</div>
						)}
					</div>
				</>
			)}

			{render_delete_modal(
				delete_target,
				() => set_delete_target(undefined),
				handle_delete_confirm,
				is_dark_mode,
				is_deleting,
				toast
			)}

			{render_rename_modal(
				rename_target,
				() => set_rename_target(undefined),
				handle_rename_confirm,
				is_dark_mode,
				is_renaming,
				projects.map((p) => p.name)
			)}
		</div>
	)
}
