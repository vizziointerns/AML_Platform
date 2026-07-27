import { Database, ArrowUpRight } from 'lucide-react'
import type { DatasetInfo } from '../../hooks/use_datasets'
import { dataset_action_menu } from './dataset_card'

export function dataset_list_row({
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
	const row_hover = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
	const menu_bg = is_dark_mode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'

	const storage_gb = (dataset.storage_bytes / (1024 * 1024 * 1024)).toFixed(1)

	return (
		<tr
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
			className={`${row_hover} transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/50`}
		>
			<td className="px-6 py-4">
				<div className="flex items-center gap-3">
					<div className={`p-2 rounded-lg ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
						<Database size={16} className={is_dark_mode ? 'text-zinc-400' : 'text-zinc-600'} />
					</div>
					<div>
						<div className={`font-medium ${text_heading}`}>{dataset.name}</div>
						<div className={`text-xs mt-0.5 ${text_muted}`}>
							{dataset.image_count.toLocaleString()} images &bull; {dataset.class_count} classes
						</div>
					</div>
				</div>
			</td>
			<td className={`px-6 py-4 ${text_muted}`}>{storage_gb} GB</td>
			<td className="px-6 py-4">
				<span
					className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider inline-flex ${dataset.status === 'Ready' || dataset.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}
				>
					{dataset.status}
				</span>
			</td>
			<td className="px-6 py-4">
				<div className="flex gap-2">
					{dataset.tags.slice(0, 3).map((tag) => (
						<span
							key={tag}
							className={`px-2 py-1 rounded-md text-[10px] font-medium border ${is_dark_mode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-600'}`}
						>
							{tag}
						</span>
					))}
				</div>
			</td>
			<td className={`px-6 py-4 text-right ${text_muted} flex justify-end items-center gap-2`}>
				{dataset.updated_at}
				<ArrowUpRight
					size={14}
					className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500"
				/>
			</td>
			<td className="px-6 py-4 text-right">
				{dataset_action_menu({
					dataset,
					on_rename,
					on_delete,
					is_menu_open,
					on_menu_toggle,
					menu_bg
				})}
			</td>
		</tr>
	)
}
