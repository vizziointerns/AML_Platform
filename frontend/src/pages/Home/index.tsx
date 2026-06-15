import React, { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { use_dashboard_stats } from '../../hooks/use_dashboard_stats'
import { use_recent_projects } from '../../hooks/use_recent_projects'
import { use_project_store } from '../../store/projectStore'
import { filter_bar } from '../../components/FilterBar'
import { recent_project_card as RecentProjectCard } from '../../components/RecentProjectCard'
import { cover_image_uploader as CoverImageUploader } from '../../components/CoverImageUploader'
import { delete_modal as DeleteModal } from '../../components/RecentProjectCard/DeleteModal'
import { Layers, ImageIcon, Users, HardDrive, Plus, ChevronRight, Pin } from 'lucide-react'

function stat_card({
	title,
	value,
	icon: Icon,
	is_dark_mode,
	text_muted
}: {
	title: string
	value: string
	icon: React.ElementType
	is_dark_mode: boolean
	text_muted: string
}) {
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'

	return (
		<div className={`stat-card ${card_classes}`}>
			<div className="flex justify-between items-start mb-3">
				<div className={`text-sm font-medium ${text_muted}`}>{title}</div>
				<div className={`p-2 rounded-lg ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
					<Icon size={18} className={is_dark_mode ? 'text-zinc-300' : 'text-zinc-600'} />
				</div>
			</div>
			<div className="text-2xl font-bold tracking-tight">{value}</div>
		</div>
	)
}

function stat_skeleton({ is_dark_mode }: { is_dark_mode: boolean }) {
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'

	return (
		<div className={`stat-card ${card_classes}`}>
			<div className="flex justify-between items-start mb-3">
				<div
					className={`h-4 w-24 rounded animate-pulse ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
				/>
				<div className={`p-2 rounded-lg ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
					<div className="w-[18px] h-[18px]" />
				</div>
			</div>
			<div
				className={`h-8 w-16 rounded animate-pulse ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
			/>
		</div>
	)
}

function project_card_skeleton({ is_dark_mode }: { is_dark_mode: boolean }) {
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'
	const skeleton_bg = is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'

	return (
		<div className={`rounded-xl border ${card_classes} p-4`}>
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-3">
					<div className={`w-10 h-10 rounded-lg animate-pulse ${skeleton_bg}`} />
					<div className="space-y-2">
						<div className={`h-4 w-28 rounded animate-pulse ${skeleton_bg}`} />
						<div className={`h-3 w-20 rounded animate-pulse ${skeleton_bg}`} />
					</div>
				</div>
				<div className={`h-5 w-14 rounded-full animate-pulse ${skeleton_bg}`} />
			</div>
			<div className="space-y-2">
				<div className="flex justify-between">
					<div className={`h-3 w-20 rounded animate-pulse ${skeleton_bg}`} />
					<div className={`h-3 w-16 rounded animate-pulse ${skeleton_bg}`} />
				</div>
				<div className={`h-1.5 rounded-full overflow-hidden ${skeleton_bg}`} />
			</div>
			<div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/50">
				<div className={`h-3 w-16 rounded animate-pulse ${skeleton_bg}`} />
				<div className="flex -space-x-1.5">
					{[...Array(3)].map((_, i) => (
						<div
							key={i}
							className={`w-5 h-5 rounded-full animate-pulse ${skeleton_bg} border-2 ${is_dark_mode ? 'border-zinc-900' : 'border-white'}`}
						/>
					))}
				</div>
			</div>
		</div>
	)
}

function format_bytes(bytes: number): string {
	const gb = bytes / 1_000_000_000
	if (gb >= 1) return `${gb.toFixed(1)} GB`
	const mb = bytes / 1_000_000
	if (mb >= 1) return `${mb.toFixed(1)} MB`
	const kb = bytes / 1_000
	if (kb >= 1) return `${kb.toFixed(1)} KB`
	return `${bytes} B`
}

function format_count(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
	return n.toString()
}

function dispatch_toast(message: string, type: 'success' | 'error' = 'success') {
	window.dispatchEvent(new CustomEvent('project-toast', { detail: { message, type } }))
}

function render_project_grid(
	projects: import('../../store/projectStore').Project[],
	is_dark_mode: boolean,
	on_click: (id: string) => void,
	on_pin: (id: string) => void,
	on_delete: (id: string, name: string) => void,
	on_change_cover?: (id: string) => void
) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{projects.map((project) => (
				<RecentProjectCard
					key={project.id}
					project={project}
					is_dark_mode={is_dark_mode}
					on_click={on_click}
					on_pin={on_pin}
					on_delete={on_delete}
					on_change_cover={on_change_cover}
				/>
			))}
		</div>
	)
}

export default function home({
	is_dark_mode,
	on_open_uploader,
	on_open_new_project
}: {
	is_dark_mode: boolean
	on_open_uploader?: () => void
	on_open_new_project?: () => void
}) {
	const navigate = useNavigate()

	const { stats, is_loading: is_stats_loading, error: stats_error } = use_dashboard_stats()
	const { is_loading: is_projects_loading, error: projects_error } = use_recent_projects()

	const store_projects = use_project_store((s) => s.projects)
	const project_type_filters = use_project_store((s) => s.project_type_filters)
	const sort_order = use_project_store((s) => s.sort_order)
	const set_project_type_filters = use_project_store((s) => s.set_project_type_filters)
	const set_sort_order = use_project_store((s) => s.set_sort_order)
	const clear_filters = use_project_store((s) => s.clear_filters)
	const toggle_pin = use_project_store((s) => s.togglePin)
	const delete_project = use_project_store((s) => s.deleteProject)
	const update_project_cover = use_project_store((s) => s.updateProjectCover)

	const [delete_target, set_delete_target] = useState<{ id: string; name: string } | undefined>(
		undefined
	)
	const [is_deleting, set_is_deleting] = useState(false)

	const [cover_upload_target, set_cover_upload_target] = useState<string | undefined>(undefined)

	const pinned_projects = useMemo(() => {
		let result = store_projects.filter((p) => p.isPinned)
		if (project_type_filters.length > 0) {
			result = result.filter((p) => project_type_filters.includes(p.type))
		}
		return [...result].sort((a, b) =>
			sort_order === 'newest' ? b.lastUpdated - a.lastUpdated : a.lastUpdated - b.lastUpdated
		)
	}, [store_projects, project_type_filters, sort_order])

	const unpinned_projects = useMemo(() => {
		let result = store_projects.filter((p) => !p.isPinned)
		if (project_type_filters.length > 0) {
			result = result.filter((p) => project_type_filters.includes(p.type))
		}
		return [...result].sort((a, b) =>
			sort_order === 'newest' ? b.lastUpdated - a.lastUpdated : a.lastUpdated - b.lastUpdated
		)
	}, [store_projects, project_type_filters, sort_order])

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

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'

	const stats_grid =
		is_stats_loading && !stats_error ? (
			<>
				{stat_skeleton({ is_dark_mode })}
				{stat_skeleton({ is_dark_mode })}
				{stat_skeleton({ is_dark_mode })}
				{stat_skeleton({ is_dark_mode })}
			</>
		) : stats_error ? undefined : (
			<>
				{stat_card({
					title: 'Total Projects',
					value: format_count(stats!.total_projects),
					icon: Layers,
					is_dark_mode,
					text_muted
				})}
				{stat_card({
					title: 'Total Images',
					value: format_count(stats!.total_images),
					icon: ImageIcon,
					is_dark_mode,
					text_muted
				})}
				{stat_card({
					title: 'Team Members',
					value: format_count(stats!.team_members),
					icon: Users,
					is_dark_mode,
					text_muted
				})}
				{stat_card({
					title: 'Storage Used',
					value: format_bytes(stats!.storage_used_bytes),
					icon: HardDrive,
					is_dark_mode,
					text_muted
				})}
			</>
		)

	const filter_element = (
		<div className="pt-2 pb-1">
			{filter_bar({
				sort_order,
				project_type_filters,
				on_sort_order_change: set_sort_order,
				on_project_type_filters_change: set_project_type_filters,
				on_clear: clear_filters,
				is_dark_mode
			})}
		</div>
	)

	const projects_section = (() => {
		if (is_projects_loading) {
			return (
				<div>
					<h2 className="text-lg font-semibold tracking-tight mb-4">Recent Projects</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{Array.from({ length: 4 }, (_, i) => (
							<div key={i}>{project_card_skeleton({ is_dark_mode })}</div>
						))}
					</div>
				</div>
			)
		}
		if (projects_error) {
			return (
				<div className={`rounded-xl border ${card_classes} p-8 text-center`}>
					<p className="text-sm text-red-500">{projects_error}</p>
				</div>
			)
		}
		if (store_projects.length === 0) {
			return (
				<div className={`rounded-xl border ${card_classes} p-8 text-center`}>
					<p className={`text-sm ${text_muted}`}>
						No projects yet. Create your first project to get started.
					</p>
				</div>
			)
		}
		return (
			<>
				{pinned_projects.length > 0 && (
					<div className="animate-in fade-in slide-in-from-top-2 duration-300">
						<div className="flex items-center gap-2 mb-4">
							<Pin size={16} className="text-yellow-500" fill="currentColor" />
							<h2 className="text-lg font-semibold tracking-tight">Pinned Projects</h2>
							<span
								className={`text-xs px-2 py-0.5 rounded-full ${is_dark_mode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}
							>
								{pinned_projects.length}
							</span>
						</div>
						{render_project_grid(
							pinned_projects,
							is_dark_mode,
							(id) => navigate(`/projects/${id}/dashboard`),
							handle_pin,
							(id, name) => set_delete_target({ id, name }),
							set_cover_upload_target
						)}
					</div>
				)}
				<div>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold tracking-tight">Recent Projects</h2>
						<button
							onClick={() => navigate('/projects')}
							className="flex items-center gap-1 text-sm text-blue-500 font-medium hover:text-blue-400"
						>
							View All <ChevronRight size={14} />
						</button>
					</div>
					{unpinned_projects.length === 0 && pinned_projects.length > 0 ? (
						<div className={`rounded-xl border ${card_classes} p-8 text-center`}>
							<p className={`text-sm ${text_muted}`}>
								All projects are pinned. Unpin some to see them here.
							</p>
						</div>
					) : (
						render_project_grid(
							unpinned_projects,
							is_dark_mode,
							(id) => navigate(`/projects/${id}/dashboard`),
							handle_pin,
							(id, name) => set_delete_target({ id, name }),
							set_cover_upload_target
						)
					)}
				</div>
			</>
		)
	})()

	return (
		<div className="space-y-8">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{stats_grid}
				{stats_error && <div className="col-span-full text-xs text-red-500">{stats_error}</div>}
			</div>

			{filter_element}

			{projects_section}

			<div className={`rounded-xl border ${card_classes} p-5`}>
				<h3 className="font-semibold text-base tracking-tight mb-4">Quick Actions</h3>
				<div className="flex flex-wrap gap-3">
					<button
						onClick={on_open_new_project}
						className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
					>
						<Plus size={16} /> New Project
					</button>
					<button
						onClick={on_open_uploader}
						className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${is_dark_mode ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
					>
						<ImageIcon size={16} /> Upload Data
					</button>
				</div>
			</div>

			{delete_target && (
				<DeleteModal
					project_name={delete_target.name}
					is_dark_mode={is_dark_mode}
					is_loading={is_deleting}
					on_confirm={handle_delete}
					on_cancel={() => set_delete_target(undefined)}
				/>
			)}

			{cover_upload_target && (
				<CoverImageUploader
					project_id={cover_upload_target}
					current_url={store_projects.find((p) => p.id === cover_upload_target)?.coverImageUrl}
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
