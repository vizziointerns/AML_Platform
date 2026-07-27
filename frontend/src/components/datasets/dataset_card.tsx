import { Database, Image as ImageIcon, Tag, MoreVertical, Pencil, Trash } from 'lucide-react'
import type { DatasetInfo } from '../../hooks/use_datasets'

function card_menu({
	dataset,
	on_rename,
	on_delete,
	is_menu_open,
	on_menu_toggle,
	menu_bg
}: {
	dataset: DatasetInfo
	on_rename?: (ds: DatasetInfo) => void
	on_delete?: (ds: DatasetInfo) => void
	is_menu_open?: boolean
	on_menu_toggle?: () => void
	menu_bg: string
}) {
	if (!on_rename && !on_delete) return undefined
	return (
		<div className="relative shrink-0" onMouseDown={(e) => e.stopPropagation()}>
			<button
				className={`p-1 rounded-md text-zinc-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer`}
				onClick={(e) => {
					e.stopPropagation()
					on_menu_toggle?.()
				}}
			>
				<MoreVertical size={16} />
			</button>
			{is_menu_open && (
				<div
					className={`absolute right-0 top-full mt-1 w-36 rounded-lg border shadow-lg ${menu_bg} py-1 z-50`}
				>
					{on_rename && (
						<button
							onMouseDown={(e) => e.stopPropagation()}
							onClick={(e) => {
								e.stopPropagation()
								on_rename(dataset)
							}}
							className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
						>
							<Pencil size={14} /> Rename
						</button>
					)}
					{on_delete && (
						<button
							onMouseDown={(e) => e.stopPropagation()}
							onClick={(e) => {
								e.stopPropagation()
								on_delete(dataset)
							}}
							className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
						>
							<Trash size={14} /> Delete
						</button>
					)}
				</div>
			)}
		</div>
	)
}

export function dataset_card({
	key,
	dataset,
	is_dark_mode,
	on_select,
	on_rename,
	on_delete,
	is_menu_open,
	on_menu_toggle
}: {
	key?: string
	dataset: DatasetInfo
	is_dark_mode: boolean
	on_select: (ds: DatasetInfo) => void
	on_rename?: (ds: DatasetInfo) => void
	on_delete?: (ds: DatasetInfo) => void
	is_menu_open?: boolean
	on_menu_toggle?: () => void
}) {
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const menu_bg = is_dark_mode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'

	const status_color =
		dataset.status === 'Ready' || dataset.status === 'Completed'
			? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
			: 'bg-amber-500/10 text-amber-500 border border-amber-500/20'

	return (
		<div
			key={key}
			onClick={() => on_select(dataset)}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					on_select(dataset)
				}
			}}
			role="button"
			tabIndex={0}
			aria-label={`Select dataset ${dataset.name}`}
			className={`rounded-xl border ${border_subtle} ${bg_card} cursor-pointer hover:border-blue-500/50 hover:shadow-md transition-all group focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
		>
			<div
				className={`h-32 ${is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-100'} p-4 relative flex items-center justify-center overflow-hidden rounded-t-xl`}
			>
				<Database
					size={32}
					className={`${is_dark_mode ? 'text-zinc-700' : 'text-zinc-300'} group-hover:scale-110 transition-transform duration-500`}
				/>
				<div className="absolute top-3 right-3">
					<span
						className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${status_color}`}
					>
						{dataset.status}
					</span>
				</div>
			</div>
			<div className="p-5">
				<div className="flex justify-between items-start mb-2">
					<h3 className={`font-semibold tracking-tight truncate ${text_heading}`}>
						{dataset.name}
					</h3>
					{card_menu({ dataset, on_rename, on_delete, is_menu_open, on_menu_toggle, menu_bg })}
				</div>
				<div className={`flex flex-wrap gap-4 text-xs ${text_muted} mb-4`}>
					<span className="flex items-center gap-1.5">
						<ImageIcon size={14} /> {dataset.image_count.toLocaleString()}
					</span>
					{dataset.class_count > 0 && (
						<span className="flex items-center gap-1.5">
							<Tag size={14} /> {dataset.class_count}
						</span>
					)}
				</div>
				<div className="flex gap-2">
					{dataset.tags.map((tag) => (
						<span
							key={tag}
							className={`px-2 py-1 rounded-md text-[10px] font-medium border ${is_dark_mode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-600'}`}
						>
							{tag}
						</span>
					))}
				</div>
			</div>
		</div>
	)
}
