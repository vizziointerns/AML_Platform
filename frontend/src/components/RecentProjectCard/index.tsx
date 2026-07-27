import { Clock, MoreVertical, Pencil, Copy, ImagePlus, Trash2 } from 'lucide-react'
import type { Project } from '../../store/projectStore'

interface RecentProjectCardProps {
	project: Project
	is_dark_mode: boolean
	on_click: (id: string) => void
	menu_open?: string
	on_menu_toggle?: (id: string | undefined) => void
	on_rename?: (p: Project) => void
	on_duplicate?: (id: string) => void
	on_add_cover?: (id: string) => void
	on_delete?: (p: Project) => void
}

function format_count(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
	return n.toString()
}

function card_menu_bar({
	project,
	is_dark_mode,
	menu_open,
	on_menu_toggle,
	on_rename,
	on_duplicate,
	on_add_cover,
	on_delete
}: {
	project: Project
	is_dark_mode: boolean
	menu_open?: string
	on_menu_toggle?: (id: string | undefined) => void
	on_rename?: (p: Project) => void
	on_duplicate?: (id: string) => void
	on_add_cover?: (id: string) => void
	on_delete?: (p: Project) => void
}) {
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const card_bg = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	if (!on_rename && !on_delete && !on_duplicate && !on_add_cover) return undefined
	return (
		<div className="relative">
			<button
				onMouseDown={(e) => e.stopPropagation()}
				onClick={(e) => {
					e.stopPropagation()
					on_menu_toggle?.(menu_open === project.id ? undefined : project.id)
				}}
				className={`p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors ${text_heading}`}
			>
				<MoreVertical size={14} />
			</button>
			{menu_open === project.id && (
				<div
					className={`absolute right-0 top-8 w-44 rounded-lg border shadow-xl z-20 py-1 ${border_subtle} ${card_bg}`}
					onMouseDown={(e) => e.stopPropagation()}
					onClick={(e) => e.stopPropagation()}
				>
					{on_rename && (
						<button
							onClick={() => on_rename(project)}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${text_heading} flex items-center gap-2`}
						>
							<Pencil size={14} /> Rename
						</button>
					)}
					{on_duplicate && (
						<button
							onClick={() => {
								on_duplicate(project.id)
								on_menu_toggle?.(undefined)
							}}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${text_heading} flex items-center gap-2`}
						>
							<Copy size={14} /> Duplicate
						</button>
					)}
					{on_add_cover && (
						<button
							onClick={() => {
								on_add_cover(project.id)
								on_menu_toggle?.(undefined)
							}}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${text_heading} flex items-center gap-2`}
						>
							<ImagePlus size={14} /> Add Cover Photo
						</button>
					)}
					{on_delete && (
						<button
							onClick={(e) => {
								e.stopPropagation()
								e.preventDefault()
								on_delete(project)
								on_menu_toggle?.(undefined)
							}}
							className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
						>
							<Trash2 size={14} /> Delete
						</button>
					)}
				</div>
			)}
		</div>
	)
}

export function recent_project_card({
	project,
	is_dark_mode,
	on_click,
	menu_open,
	on_menu_toggle,
	on_rename,
	on_duplicate,
	on_add_cover,
	on_delete
}: RecentProjectCardProps) {
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'

	const status_colors: Record<string, string> = {
		Active: 'bg-emerald-500/10 text-emerald-500',
		Draft: 'bg-zinc-500/10 text-zinc-500',
		Completed: 'bg-blue-500/10 text-blue-500',
		Archived: 'bg-amber-500/10 text-amber-500'
	}

	return (
		<div
			onClick={() => on_click(project.id)}
			className={`rounded-xl border ${border_subtle} ${card_classes} p-4 hover:shadow-lg transition-all cursor-pointer relative`}
		>
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-3">
					<div
						className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'} ${text_heading}`}
					>
						{project.name[0]}
					</div>
					<div className="min-w-0">
						<h3 className="font-medium text-sm truncate max-w-28">{project.name}</h3>
						<span className={`text-xs ${text_muted}`}>{project.type}</span>
					</div>
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<div
						className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
							status_colors[project.status] ?? 'bg-zinc-500/10 text-zinc-500'
						}`}
					>
						{project.status}
					</div>
					{card_menu_bar({
						project,
						is_dark_mode,
						menu_open,
						on_menu_toggle,
						on_rename,
						on_duplicate,
						on_add_cover,
						on_delete
					})}
				</div>
			</div>

			<div className="space-y-2">
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
				<div className="flex -space-x-1.5">
					{project.members.slice(0, 3).map((m, i) => (
						<div
							key={i}
							className={`w-5 h-5 rounded-full text-[9px] font-medium flex items-center justify-center border-2 ${is_dark_mode ? 'border-zinc-900 bg-zinc-800 text-zinc-300' : 'border-white bg-zinc-200 text-zinc-600'}`}
							title={m}
						>
							{m[0]}
						</div>
					))}
					{project.members.length > 3 && (
						<div
							className={`w-5 h-5 rounded-full text-[9px] font-medium flex items-center justify-center border-2 ${is_dark_mode ? 'border-zinc-900 bg-zinc-800 text-zinc-400' : 'border-white bg-zinc-200 text-zinc-500'}`}
						>
							+{project.members.length - 3}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
