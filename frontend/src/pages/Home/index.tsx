import { useNavigate } from 'react-router-dom'
import { use_dashboard_stats, type DashboardStats } from '../../hooks/use_dashboard_stats'
import { use_recent_projects } from '../../hooks/use_recent_projects'
import { use_activity_feed, type ActivityItem } from '../../hooks/use_activity_feed'
import { use_alerts, type Alert } from '../../hooks/use_alerts'
import { recent_project_card as RecentProjectCard } from '../../components/RecentProjectCard'
import type { User } from '@supabase/supabase-js'
import {
	Layers,
	ImageIcon,
	Users,
	HardDrive,
	Plus,
	ChevronRight,
	Database,
	AlertCircle
} from 'lucide-react'

function greeting(name: string | undefined): string {
	const hour = new Date().getHours()
	const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
	const display_name = name?.split(' ')[0] ?? 'there'
	return `${period}, ${display_name}`
}

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

function stats_grid({
	stats,
	is_loading,
	error,
	is_refreshing,
	is_dark_mode,
	text_muted
}: {
	stats: DashboardStats | undefined
	is_loading: boolean
	error: string | undefined
	is_refreshing: boolean
	is_dark_mode: boolean
	text_muted: string
}) {
	const resolved = stats ?? {
		total_projects: 0,
		total_images: 0,
		team_members: 0,
		storage_used_bytes: 0
	}

	return (
		<div className="relative">
			{is_refreshing && (
				<div className="absolute -top-3 right-0 z-10 flex items-center gap-1.5 text-[11px] text-blue-500 font-medium">
					<div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
					Refreshing...
				</div>
			)}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{is_loading && !error ? (
					<>
						{stat_skeleton({ is_dark_mode })}
						{stat_skeleton({ is_dark_mode })}
						{stat_skeleton({ is_dark_mode })}
						{stat_skeleton({ is_dark_mode })}
					</>
				) : (
					<>
						{stat_card({
							title: 'Total Projects',
							value: format_count(resolved.total_projects),
							icon: Layers,
							is_dark_mode,
							text_muted
						})}
						{stat_card({
							title: 'Total Images',
							value: format_count(resolved.total_images),
							icon: ImageIcon,
							is_dark_mode,
							text_muted
						})}
						{stat_card({
							title: 'Team Members',
							value: format_count(resolved.team_members),
							icon: Users,
							is_dark_mode,
							text_muted
						})}
						{stat_card({
							title: 'Storage Used',
							value: format_bytes(resolved.storage_used_bytes),
							icon: HardDrive,
							is_dark_mode,
							text_muted
						})}
					</>
				)}
				{error && <div className="col-span-full text-xs text-red-500">{error}</div>}
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

function format_count(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
	return n.toString()
}

function alert_skeleton(is_dark_mode: boolean) {
	const skeleton_bg = is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'
	return (
		<div
			className={`flex gap-3 animate-pulse p-3 rounded-lg border ${is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'}`}
		>
			<div className={`w-4 h-4 rounded mt-0.5 shrink-0 ${skeleton_bg}`} />
			<div className="flex-1 space-y-2">
				<div className={`h-3 w-40 rounded ${skeleton_bg}`} />
				<div className={`h-2.5 w-56 rounded ${skeleton_bg}`} />
			</div>
		</div>
	)
}

function alert_colors(severity: Alert['severity'], is_dark_mode: boolean) {
	if (severity === 'danger') {
		return is_dark_mode
			? 'bg-red-500/5 border-red-500/20 text-red-400'
			: 'bg-red-50 border-red-200 text-red-800'
	}
	if (severity === 'warning') {
		return is_dark_mode
			? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
			: 'bg-amber-50 border-amber-200 text-amber-800'
	}
	return is_dark_mode
		? 'bg-blue-500/5 border-blue-500/20 text-blue-400'
		: 'bg-blue-50 border-blue-200 text-blue-800'
}

function alert_icon_color(severity: Alert['severity']) {
	if (severity === 'danger') return 'text-red-500'
	if (severity === 'warning') return 'text-amber-500'
	return 'text-blue-500'
}

function alerts_widget({
	alerts,
	is_loading,
	is_dark_mode,
	card_classes
}: {
	alerts: Alert[]
	is_loading: boolean
	is_dark_mode: boolean
	card_classes: string
}) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'

	return (
		<div className={`rounded-xl border ${card_classes} p-5`}>
			<h3 className="font-semibold text-base tracking-tight mb-4 flex items-center gap-2">
				<AlertCircle size={16} className="text-amber-500" /> Alerts
			</h3>
			<div className="space-y-3">
				{is_loading ? (
					<>
						{alert_skeleton(is_dark_mode)}
						{alert_skeleton(is_dark_mode)}
					</>
				) : alerts.length === 0 ? (
					<p className={`text-sm ${text_muted} text-center py-4`}>
						No alerts — everything looks good
					</p>
				) : (
					alerts.map((alert) => (
						<div
							key={alert.id}
							className={`p-3 rounded-lg border flex gap-3 text-sm ${alert_colors(alert.severity, is_dark_mode)}`}
						>
							<div className="mt-0.5">
								<AlertCircle size={16} className={alert_icon_color(alert.severity)} />
							</div>
							<div>
								<div className="font-medium">{alert.title}</div>
								<div className={`text-xs mt-1 opacity-70`}>{alert.description}</div>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	)
}

function activity_skeleton(is_dark_mode: boolean) {
	const skeleton_bg = is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'
	return (
		<div className="flex gap-3 animate-pulse">
			<div className={`w-8 h-8 rounded-full shrink-0 ${skeleton_bg}`} />
			<div className="flex-1 space-y-2 py-1">
				<div className={`h-3 w-48 rounded ${skeleton_bg}`} />
				<div className={`h-2.5 w-16 rounded ${skeleton_bg}`} />
			</div>
		</div>
	)
}

function team_activity_widget({
	items,
	is_loading,
	avatar_text,
	is_dark_mode,
	text_muted,
	card_classes
}: {
	items: ActivityItem[]
	is_loading: boolean
	avatar_text: string
	is_dark_mode: boolean
	text_muted: string
	card_classes: string
}) {
	return (
		<div className={`rounded-xl border ${card_classes} p-5`}>
			<h3 className="font-semibold text-base tracking-tight mb-4">Activity</h3>
			<div className="space-y-4">
				{is_loading ? (
					<>
						{activity_skeleton(is_dark_mode)}
						{activity_skeleton(is_dark_mode)}
						{activity_skeleton(is_dark_mode)}
						{activity_skeleton(is_dark_mode)}
						{activity_skeleton(is_dark_mode)}
					</>
				) : items.length === 0 ? (
					<p className={`text-sm ${text_muted} text-center py-4`}>No recent activity</p>
				) : (
					items.map((item) => (
						<div key={item.id} className="flex gap-3">
							<div
								className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center text-xs font-medium ${is_dark_mode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}
							>
								{avatar_text}
							</div>
							<div className="flex-1 min-w-0">
								<div className="text-sm">{item.description}</div>
								<div className={`text-xs ${text_muted} mt-0.5`}>{item.relative_time}</div>
							</div>
						</div>
					))
				)}
			</div>
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
