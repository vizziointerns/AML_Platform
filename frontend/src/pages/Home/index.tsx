import { useNavigate } from 'react-router-dom'
import { use_dashboard_stats } from '../../hooks/use_dashboard_stats'
import { use_recent_projects } from '../../hooks/use_recent_projects'
import { use_activity_feed } from '../../hooks/use_activity_feed'
import { use_alerts } from '../../hooks/use_alerts'
import { recent_project_card as RecentProjectCard } from '../../components/RecentProjectCard'
import type { User } from '@supabase/supabase-js'
import { Plus, ChevronRight, Database } from 'lucide-react'
import { stats_grid } from './stats_grid'
import { alerts_widget } from './alerts_widget'
import { team_activity_widget } from './activity_widget'

function greeting(name: string | undefined): string {
	const hour = new Date().getHours()
	const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
	const display_name = name?.split(' ')[0] ?? 'there'
	return `${period}, ${display_name}`
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

function recent_projects_section({
	recent,
	is_loading,
	error,
	is_dark_mode,
	text_muted,
	card_classes,
	on_open_new_project,
	on_navigate
}: {
	recent: import('../../store/projectStore').Project[]
	is_loading: boolean
	error: string | undefined
	is_dark_mode: boolean
	text_muted: string
	card_classes: string
	on_open_new_project?: () => void
	on_navigate: (id: string) => void
}) {
	return (
		<div>
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-semibold tracking-tight">Recent Projects</h2>
				<button
					onClick={() => on_navigate('')}
					className="flex items-center gap-1 text-sm text-blue-500 font-medium hover:text-blue-400"
				>
					View All <ChevronRight size={14} />
				</button>
			</div>

			{is_loading ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{Array.from({ length: 4 }, (_, i) => (
						<div key={i}>{project_card_skeleton({ is_dark_mode })}</div>
					))}
				</div>
			) : error ? (
				<div className={`rounded-xl border ${card_classes} p-8 text-center`}>
					<p className="text-sm text-red-500">{error}</p>
				</div>
			) : recent.length === 0 ? (
				<div className={`rounded-xl border ${card_classes} p-8 text-center`}>
					<p className={`text-sm ${text_muted} mb-4`}>
						No projects yet. Create your first project to get started.
					</p>
					<button
						onClick={on_open_new_project}
						className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
					>
						<Plus size={16} /> Create Project
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{recent.map((project) => (
						<RecentProjectCard
							key={project.id}
							project={project}
							is_dark_mode={is_dark_mode}
							on_click={on_navigate}
						/>
					))}
				</div>
			)}
		</div>
	)
}

export default function home({
	user,
	is_dark_mode,
	on_open_uploader,
	on_open_new_project
}: {
	user: User | undefined
	is_dark_mode: boolean
	on_open_uploader?: () => void
	on_open_new_project?: () => void
}) {
	const navigate = useNavigate()
	const user_name = user?.user_metadata?.full_name as string | undefined
	const display_name = user_name ?? user?.email?.split('@')[0]
	const avatar_initials = user_name
		? user_name
				.split(' ')
				.map((s) => s[0])
				.join('')
				.toUpperCase()
				.slice(0, 2)
		: (user?.email?.[0]?.toUpperCase() ?? '?')

	const {
		stats,
		is_loading: is_stats_loading,
		is_refreshing,
		error: stats_error
	} = use_dashboard_stats()
	const {
		projects: recent,
		is_loading: is_projects_loading,
		error: projects_error
	} = use_recent_projects()
	const { items: activity_items, is_loading: is_activity_loading } = use_activity_feed()
	const { alerts, is_loading: is_alerts_loading } = use_alerts()

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'

	return (
		<div className="space-y-8">
			<div>
				<p className="text-lg font-medium">{greeting(display_name)}</p>
			</div>

			{stats_grid({
				stats,
				is_loading: is_stats_loading,
				error: stats_error,
				is_refreshing,
				is_dark_mode,
				text_muted
			})}

			{recent_projects_section({
				recent,
				is_loading: is_projects_loading,
				error: projects_error,
				is_dark_mode,
				text_muted,
				card_classes,
				on_open_new_project,
				on_navigate: (id) => navigate(id ? `/projects/${id}/dashboard` : '/projects')
			})}

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
						<Database size={16} /> Upload Dataset
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{alerts_widget({
					alerts,
					is_loading: is_alerts_loading,
					is_dark_mode,
					card_classes
				})}
				{team_activity_widget({
					items: activity_items,
					is_loading: is_activity_loading,
					avatar_text: avatar_initials,
					is_dark_mode,
					text_muted,
					card_classes
				})}
			</div>
		</div>
	)
}
