import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { use_project_store, type Project, type ProjectType } from '../../store/projectStore'
import { use_app_context } from '../../contexts/app_context'
import { use_projects } from '../../hooks/use_projects'
import {
	Search,
	Plus,
	LayoutGrid,
	List as ListIcon,
	MoreVertical,
	Pin,
	Clock,
	Edit3,
	AlertTriangle
} from 'lucide-react'
import DeleteProjectDialog from '../../components/DeleteProjectDialog'

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
		duplicateProject: duplicate_project
	} = use_project_store()

	const navigate = useNavigate()

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

	const [delete_target, set_delete_target] = useState<Project | undefined>(undefined)
	const [toast, set_toast] = useState<{ type: 'success' | 'error'; message: string } | undefined>(
		undefined
	)

	useEffect(() => {
		if (!toast) return
		const timer = setTimeout(() => set_toast(undefined), 4000)
		return () => clearTimeout(timer)
	}, [toast])

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-100'

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
					<div
						className={
							view_mode === 'grid'
								? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
								: 'space-y-2'
						}
					>
						{filtered.map((project) => (
							<div
								key={project.id}
								onClick={() => navigate(`/projects/${project.id}/dashboard`)}
								className={`rounded-xl border ${border_subtle} ${bg_card} p-4 hover:shadow-lg transition-shadow relative cursor-pointer`}
							>
								<div className="flex items-start justify-between mb-3">
									<div className="flex items-center gap-3">
										<div
											className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'} ${text_heading}`}
										>
											{project.name[0]}
										</div>
										<div>
											<h3 className={`font-medium text-sm ${text_heading}`}>{project.name}</h3>
											<span className={`text-xs ${text_muted}`}>{project.type}</span>
										</div>
									</div>
									<div className="relative">
										<button
											onClick={(e) => {
												e.stopPropagation()
												set_menu_open(menu_open === project.id ? undefined : project.id)
											}}
											className={`p-1 rounded hover:${bg_subtle}`}
										>
											<MoreVertical size={16} className={text_muted} />
										</button>
										{menu_open === project.id && (
											<div
												className={`absolute right-0 top-8 w-36 rounded-lg border ${border_subtle} ${bg_card} shadow-xl z-10 py-1`}
											>
												<button
													onClick={() => {
														duplicate_project(project.id)
														set_menu_open(undefined)
													}}
													className={`w-full text-left px-3 py-2 text-sm hover:${bg_subtle} ${text_heading} flex items-center gap-2`}
												>
													<Edit3 size={14} /> Duplicate
												</button>
												<button
													onClick={(e) => {
														e.stopPropagation()
														e.preventDefault()
														set_delete_target(project)
														set_menu_open(undefined)
													}}
													className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
												>
													<AlertTriangle size={14} className="text-red-500" /> Delete
												</button>
											</div>
										)}
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
										<span className={text_muted}>
											{new Date(project.lastUpdated).toLocaleDateString()}
										</span>
									</div>
									<div className="flex items-center gap-1">
										<button
											onClick={(e) => {
												e.stopPropagation()
												toggle_pin(project.id)
											}}
											className={`p-1 rounded ${project.isPinned ? 'text-yellow-500' : text_muted}`}
										>
											<Pin size={14} />
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{toast && toast_bar({ toast, on_dismiss: () => set_toast(undefined) })}

			<DeleteProjectDialog
				delete_target={delete_target}
				on_close={() => set_delete_target(undefined)}
				on_success={(name) =>
					set_toast({ type: 'success', message: `"${name}" has been deleted.` })
				}
				is_dark_mode={is_dark_mode}
			/>
		</>
	)
}
