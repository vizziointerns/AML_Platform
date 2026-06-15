import { Clock, Pin, Trash2, ImageIcon } from 'lucide-react'
import type { Project } from '../../store/projectStore'

interface RecentProjectCardProps {
	project: Project
	is_dark_mode: boolean
	on_click: (id: string) => void
	on_pin: (id: string) => void
	on_delete: (id: string, name: string) => void
	on_change_cover?: (id: string) => void
}

function format_count(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
	return n.toString()
}

function member_avatars(members: string[], border_avatar: string) {
	return (
		<div className="flex -space-x-1.5">
			{members.slice(0, 3).map((m, i) => (
				<div
					key={i}
					className={`w-5 h-5 rounded-full text-[9px] font-medium flex items-center justify-center border-2 ${border_avatar}`}
					title={m}
				>
					{m[0]}
				</div>
			))}
			{members.length > 3 && (
				<div
					className={`w-5 h-5 rounded-full text-[9px] font-medium flex items-center justify-center border-2 ${border_avatar}`}
				>
					+{members.length - 3}
				</div>
			)}
		</div>
	)
}

function render_cover_area(project: Project, is_dark_mode: boolean) {
	return project.coverImageUrl ? (
		<div className="relative h-28 overflow-hidden">
			<img
				src={project.coverImageUrl}
				alt={project.name}
				className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
			/>
			<div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
		</div>
	) : (
		<div
			className={`h-28 ${is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-100'} flex items-center justify-center`}
		>
			<div
				className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold ${is_dark_mode ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-700'}`}
			>
				{project.name[0]}
			</div>
		</div>
	)
}

function render_info_section(
	project: Project,
	is_dark_mode: boolean,
	text_muted: string,
	border_subtle: string,
	border_avatar: string,
	status_colors: Record<string, string>
) {
	return (
		<div className="p-4">
			<div className="flex items-start justify-between gap-2">
				<h3
					className={`font-medium text-sm truncate ${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'}`}
				>
					{project.name}
				</h3>
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
				<div className={`flex justify-between text-xs ${text_muted}`}>
					<span>{format_count(project.datasetCount)} images</span>
					<span>{project.annotationProgress}% annotated</span>
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
				<div className={`flex items-center gap-1.5 text-xs ${text_muted}`}>
					<Clock size={12} />
					{new Date(project.lastUpdated).toLocaleDateString()}
				</div>
				{member_avatars(project.members, border_avatar)}
			</div>
		</div>
	)
}

function render_action_buttons(
	project: Project,
	is_dark_mode: boolean,
	text_muted: string,
	on_change_cover: ((id: string) => void) | undefined,
	on_pin: (id: string) => void,
	on_delete: (id: string, name: string) => void
) {
	return (
		<div
			className="flex items-center justify-end gap-1 px-4 pb-3"
			onClick={(e) => e.stopPropagation()}
		>
			{on_change_cover && (
				<button
					onClick={() => on_change_cover(project.id)}
					className={`p-1.5 rounded-md ${text_muted} hover:text-blue-500 ${is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} transition-colors`}
					title="Change cover image"
				>
					<ImageIcon size={14} />
				</button>
			)}
			<button
				onClick={() => on_pin(project.id)}
				className={`p-1.5 rounded-md transition-colors ${
					project.isPinned
						? 'text-yellow-500 hover:text-yellow-400'
						: `${text_muted} hover:text-yellow-500`
				} ${is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
				title={project.isPinned ? 'Unpin project' : 'Pin project'}
			>
				<Pin size={14} fill={project.isPinned ? 'currentColor' : 'none'} />
			</button>
			<button
				onClick={() => on_delete(project.id, project.name)}
				className={`p-1.5 rounded-md ${text_muted} hover:text-red-500 ${is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} transition-colors`}
				title="Delete project"
			>
				<Trash2 size={14} />
			</button>
		</div>
	)
}

export function recent_project_card({
	project,
	is_dark_mode,
	on_click,
	on_pin,
	on_delete,
	on_change_cover
}: RecentProjectCardProps) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const border_avatar = is_dark_mode
		? 'border-zinc-900 bg-zinc-800 text-zinc-300'
		: 'border-white bg-zinc-200 text-zinc-600'

	const status_colors: Record<string, string> = {
		Active: 'bg-emerald-500/10 text-emerald-500',
		Draft: 'bg-zinc-500/10 text-zinc-500',
		Completed: 'bg-blue-500/10 text-blue-500',
		Archived: 'bg-amber-500/10 text-amber-500'
	}

	return (
		<div
			className={`rounded-xl border ${border_subtle} ${card_classes} hover:shadow-lg transition-all group overflow-hidden`}
		>
			<div onClick={() => on_click(project.id)} className="cursor-pointer">
				{render_cover_area(project, is_dark_mode)}
				{render_info_section(
					project,
					is_dark_mode,
					text_muted,
					border_subtle,
					border_avatar,
					status_colors
				)}
			</div>

			{render_action_buttons(project, is_dark_mode, text_muted, on_change_cover, on_pin, on_delete)}
		</div>
	)
}
