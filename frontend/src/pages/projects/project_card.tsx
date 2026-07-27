import {
	MoreVertical,
	Pin,
	Clock,
	Pencil,
	Copy,
	ImagePlus,
	Trash2,
	ScanLine,
	Shapes,
	Tags,
	Crosshair,
	FileText,
	Video,
	Box
} from 'lucide-react'
import type { Project } from '../../store/projectStore'

const TYPE_ICON: Record<string, typeof Crosshair> = {
	'Object Detection': ScanLine,
	'Semantic Segmentation': Shapes,
	'Instance Segmentation': Shapes,
	Classification: Tags,
	'Keypoint Detection': Crosshair,
	OCR: FileText,
	'Video Tracking': Video,
	'3D Vision': Box
}

export function project_card_cover(project: Project, is_dark_mode: boolean) {
	const cover_class = is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'
	const ICON_COMP = TYPE_ICON[project.type]
	const dot_color = is_dark_mode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'
	const icon_color = is_dark_mode ? 'text-white/30' : 'text-black/20'

	return (
		<div className={`h-32 relative overflow-hidden ${cover_class}`}>
			{project.thumbnail ? (
				<img src={project.thumbnail} alt="" className="w-full h-full object-cover" />
			) : (
				<div
					className="w-full h-full flex items-center justify-center"
					style={{
						background: `radial-gradient(circle, ${dot_color} 1px, transparent 1px)`,
						backgroundSize: '16px 16px'
					}}
				>
					{ICON_COMP && <ICON_COMP size={48} className={icon_color} strokeWidth={1.5} />}
				</div>
			)}
		</div>
	)
}

export function project_card_grid(
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
			className={`rounded-xl border ${border_subtle} ${bg_card} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative cursor-pointer`}
		>
			{project_card_cover(project, is_dark_mode)}

			<div className="p-4">
				<div className="flex items-center gap-3 mb-3">
					<div
						className={`w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold shrink-0 ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'} ${text_heading}`}
					>
						{project.name[0]}
					</div>
					<div className="min-w-0 flex-1">
						<h3 className={`font-medium text-sm truncate ${text_heading}`}>{project.name}</h3>
						<span className={`text-xs ${text_muted}`}>{project.type}</span>
					</div>
					<div className="relative shrink-0">
						<button
							onMouseDown={(e) => e.stopPropagation()}
							onClick={(e) => {
								e.stopPropagation()
								on_menu_toggle(menu_open === project.id ? undefined : project.id)
							}}
							className={`p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors ${text_heading}`}
						>
							<MoreVertical size={16} />
						</button>
						{menu_open === project.id && (
							<div
								className={`absolute right-0 top-8 w-44 rounded-lg border shadow-xl z-20 py-1 ${border_subtle} ${bg_card}`}
								onMouseDown={(e) => e.stopPropagation()}
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
						<span className={text_muted}>{new Date(project.lastUpdated).toLocaleDateString()}</span>
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
				</div>
			</div>
		</div>
	)
}
