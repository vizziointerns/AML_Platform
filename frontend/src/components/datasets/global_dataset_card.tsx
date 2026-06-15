import type { GlobalDatasetInfo } from '../../hooks/use_all_datasets'
import {
	Database,
	Image as ImageIcon,
	Folder,
	MoreVertical,
	Eye,
	Pencil,
	Trash,
	Copy
} from 'lucide-react'
import type { MouseEvent, KeyboardEvent } from 'react'

function action_button({
	icon: Icon,
	label,
	on_click
}: {
	icon: typeof Eye
	label: string
	on_click: (e: MouseEvent) => void
}) {
	return (
		<button
			onMouseDown={(e) => e.stopPropagation()}
			onClick={(e) => {
				e.stopPropagation()
				on_click(e)
			}}
			className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
		>
			<Icon size={14} /> {label}
		</button>
	)
}

function dataset_action_menu({
	dataset,
	is_dark_mode,
	on_view,
	on_edit,
	on_delete,
	on_duplicate,
	is_menu_open,
	on_menu_toggle
}: {
	dataset: GlobalDatasetInfo
	is_dark_mode: boolean
	on_view: (ds: GlobalDatasetInfo) => void
	on_edit?: (ds: GlobalDatasetInfo) => void
	on_delete?: (ds: GlobalDatasetInfo) => void
	on_duplicate?: (ds: GlobalDatasetInfo) => void
	is_menu_open?: boolean
	on_menu_toggle?: () => void
}) {
	const menu_bg = is_dark_mode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'

	if (!on_edit && !on_delete && !on_duplicate) return undefined

	return (
		<div className="relative shrink-0">
			<button
				className="p-1 rounded-md text-zinc-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
				onClick={(e) => {
					e.stopPropagation()
					on_menu_toggle?.()
				}}
			>
				<MoreVertical size={15} />
			</button>
			{is_menu_open && (
				<div
					className={`absolute right-0 top-full mt-1 w-40 rounded-lg border shadow-lg ${menu_bg} py-1 z-50`}
				>
					{action_button({
						icon: Eye,
						label: 'View',
						on_click: (e) => {
							e.stopPropagation()
							on_view(dataset)
						}
					})}
					{on_edit &&
						action_button({
							icon: Pencil,
							label: 'Edit',
							on_click: (e) => {
								e.stopPropagation()
								on_edit(dataset)
							}
						})}
					{on_duplicate &&
						action_button({
							icon: Copy,
							label: 'Duplicate',
							on_click: (e) => {
								e.stopPropagation()
								on_duplicate(dataset)
							}
						})}
					{on_delete &&
						action_button({
							icon: Trash,
							label: 'Delete',
							on_click: (e) => {
								e.stopPropagation()
								on_delete(dataset)
							}
						})}
				</div>
			)}
		</div>
	)
}

export function global_dataset_card({
	dataset,
	is_dark_mode,
	on_view,
	on_edit,
	on_delete,
	on_duplicate,
	is_menu_open,
	on_menu_toggle
}: {
	dataset: GlobalDatasetInfo
	is_dark_mode: boolean
	on_view: (ds: GlobalDatasetInfo) => void
	on_edit?: (ds: GlobalDatasetInfo) => void
	on_delete?: (ds: GlobalDatasetInfo) => void
	on_duplicate?: (ds: GlobalDatasetInfo) => void
	is_menu_open?: boolean
	on_menu_toggle?: () => void
}) {
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'

	const status_color =
		dataset.status === 'Ready' || dataset.status === 'Active'
			? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
			: 'bg-amber-500/10 text-amber-500 border border-amber-500/20'

	const created_date = new Date(dataset.created_at).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	})

	const menu = dataset_action_menu({
		dataset,
		is_dark_mode,
		on_view,
		on_edit,
		on_delete,
		on_duplicate,
		is_menu_open,
		on_menu_toggle
	})

	const bg_header = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-100'
	const db_color = is_dark_mode ? 'text-zinc-700' : 'text-zinc-300'

	return (
		<div
			onClick={() => on_view(dataset)}
			onKeyDown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					on_view(dataset)
				}
			}}
			role="button"
			tabIndex={0}
			aria-label={`View dataset ${dataset.name}`}
			className={`rounded-xl border ${border_subtle} ${bg_card} cursor-pointer hover:border-blue-500/50 hover:shadow-md transition-all group focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
		>
			<div
				className={`h-28 ${bg_header} p-4 relative flex items-center justify-center overflow-hidden rounded-t-xl`}
			>
				<Database
					size={28}
					className={`${db_color} group-hover:scale-110 transition-transform duration-500`}
				/>
				<div className="absolute top-3 right-3">
					<span
						className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${status_color}`}
					>
						{dataset.status}
					</span>
				</div>
			</div>
			<div className="p-4">
				<div className="flex justify-between items-start mb-2">
					<h3 className={`font-semibold tracking-tight truncate text-sm ${text_heading}`}>
						{dataset.name}
					</h3>
					{menu}
				</div>

				<div className={`flex items-center gap-3 text-xs ${text_muted} mb-3`}>
					<span className="flex items-center gap-1">
						<ImageIcon size={13} /> {dataset.image_count.toLocaleString()}
					</span>
					<span className="flex items-center gap-1">
						<Folder size={13} /> {dataset.project_name}
					</span>
				</div>

				<div className={`text-[11px] ${text_muted}`}>{created_date}</div>
			</div>
		</div>
	)
}
