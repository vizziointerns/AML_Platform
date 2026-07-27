import { MoreVertical, Pencil, Copy, ImagePlus, Trash2 } from 'lucide-react'
import type { Project } from '../store/projectStore'

interface ProjectActionMenuProps {
	project: Project
	is_dark_mode: boolean
	menu_open?: string
	on_menu_toggle?: (id: string | undefined) => void
	on_rename?: (p: Project) => void
	on_duplicate?: (id: string) => void
	on_add_cover?: (id: string) => void
	on_delete?: (p: Project) => void
}

export function project_action_menu({
	project,
	is_dark_mode,
	menu_open,
	on_menu_toggle,
	on_rename,
	on_duplicate,
	on_add_cover,
	on_delete
}: ProjectActionMenuProps) {
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
				onKeyDown={(e) => {
					if (e.key === 'Escape' && menu_open === project.id) {
						e.stopPropagation()
						on_menu_toggle?.(undefined)
					}
				}}
				aria-haspopup={true}
				aria-expanded={menu_open === project.id}
				aria-label={`Actions for ${project.name}`}
				className={`p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors ${text_heading}`}
			>
				<MoreVertical size={16} />
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
