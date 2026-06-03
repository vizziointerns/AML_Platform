import { useNavigate } from 'react-router-dom'
import { use_dashboard_stats } from '../../hooks/use_dashboard_stats'
import { use_recent_projects } from '../../hooks/use_recent_projects'
import { recent_project_card as RecentProjectCard } from '../../components/RecentProjectCard'
import { Layers, ImageIcon, Users, HardDrive, Plus, ChevronRight } from 'lucide-react'

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
		<div className={`p-5 rounded-xl border flex flex-col ${card_classes}`}>
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
		<div className={`p-5 rounded-xl border flex flex-col ${card_classes}`}>
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

export default function home({
	is_dark_mode,
	on_open_uploader
}: {
	is_dark_mode: boolean
	on_open_uploader?: () => void
}) {
	const navigate = useNavigate()

	const { stats, is_loading: is_stats_loading, error: stats_error } = use_dashboard_stats()
	const {
		projects: recent,
		is_loading: is_projects_loading,
		error: projects_error
	} = use_recent_projects()

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'

	return (
		<div className="space-y-8">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{is_stats_loading && !stats_error ? (
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
				)}
				{stats_error && <div className="col-span-full text-xs text-red-500">{stats_error}</div>}
			</div>

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

				{is_projects_loading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{Array.from({ length: 4 }, (_, i) => (
							<div key={i}>{project_card_skeleton({ is_dark_mode })}</div>
						))}
					</div>
				) : projects_error ? (
					<div className={`rounded-xl border ${card_classes} p-8 text-center`}>
						<p className="text-sm text-red-500">{projects_error}</p>
					</div>
				) : recent.length === 0 ? (
					<div className={`rounded-xl border ${card_classes} p-8 text-center`}>
						<p className={`text-sm ${text_muted}`}>
							No projects yet. Create your first project to get started.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{recent.map((project) => (
							<RecentProjectCard
								key={project.id}
								project={project}
								is_dark_mode={is_dark_mode}
								on_click={(id) => navigate(`/projects/${id}/dashboard`)}
							/>
						))}
					</div>
				)}
			</div>

			<div className={`rounded-xl border ${card_classes} p-5`}>
				<h3 className="font-semibold text-base tracking-tight mb-4">Quick Actions</h3>
				<div className="flex flex-wrap gap-3">
					<button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
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
		</div>
	)
}
