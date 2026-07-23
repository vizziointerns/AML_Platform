import { Pin, Clock, MoreVertical, Pencil, Copy, ImagePlus, Trash2 } from 'lucide-react'
import type { Project } from '../../store/projectStore'

export function project_card_list(
	project: Project,
	is_dark_mode: boolean,
	menu_open: string | undefined,
	on_menu_toggle: (id: string | undefined) => void,
	on_navigate: (id: string) => void,
	on_duplicate: (id: string) => void,
	on_rename: (p: Project) => void,
	on_add_cover: (id: string) => void,
	on_delete: (p: Project) => void,
	on_toggle_pin: (id: string) => void
) {
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'

	return (
		<div
			key={project.id}
			onClick={() => on_navigate(project.id)}
			className={`rounded-xl border ${border_subtle} ${bg_card} p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/30 relative cursor-pointer flex items-center gap-4`}
		>
			<div
				className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0 ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'} ${text_heading}`}
			>
				{project.name[0]}
			</div>
			<div className="flex-1 min-w-0">
				<h3 className={`font-medium text-sm truncate ${text_heading}`}>{project.name}</h3>
				<span className={`text-xs ${text_muted}`}>{project.type}</span>
			</div>
			<div className="flex items-center gap-4 text-xs shrink-0">
				<div className="flex items-center gap-2">
					<div className="flex flex-col items-end gap-1">
						<span className={text_muted}>{project.datasetCount} images</span>
						<span className={text_muted}>{project.annotationProgress}% annotated</span>
					</div>
					<div
						className={`w-20 h-1.5 rounded-full overflow-hidden ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
					>
						<div
							className="h-full bg-blue-500 rounded-full transition-all"
							style={{ width: `${project.annotationProgress}%` }}
						/>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Clock size={12} className={text_muted} />
					<span className={text_muted}>{new Date(project.lastUpdated).toLocaleDateString()}</span>
				</div>
			</div>
			<button
				onClick={(e) => {
					e.stopPropagation()
					on_toggle_pin(project.id)
				}}
				className={`p-1 rounded ${project.isPinned ? 'text-yellow-500' : text_muted}`}
			>
				<Pin size={14} />
			</button>
			<div className="relative">
				<button
					onClick={(e) => {
						e.stopPropagation()
						on_menu_toggle(menu_open === project.id ? undefined : project.id)
					}}
					className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/50`}
				>
					<MoreVertical size={16} className={text_muted} />
				</button>
				{menu_open === project.id && (
					<div
						className={`absolute right-0 top-8 w-44 rounded-lg border shadow-xl z-10 py-1 ${border_subtle} ${bg_card}`}
						onClick={(e) => e.stopPropagation()}
					>
						<button
							onClick={() => on_rename(project)}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${text_heading} flex items-center gap-2`}
						>
							<Pencil size={14} /> Rename
						</button>
						<button
							onClick={() => {
								on_duplicate(project.id)
								on_menu_toggle(undefined)
							}}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${text_heading} flex items-center gap-2`}
						>
							<Copy size={14} /> Duplicate
						</button>
						<button
							onClick={() => {
								on_add_cover(project.id)
								on_menu_toggle(undefined)
							}}
							className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 ${text_heading} flex items-center gap-2`}
						>
							<ImagePlus size={14} /> Add Cover Photo
						</button>
						<button
							onClick={(e) => {
								e.stopPropagation()
								e.preventDefault()
								on_delete(project)
								on_menu_toggle(undefined)
							}}
							className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
						>
							<Trash2 size={14} /> Delete
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
