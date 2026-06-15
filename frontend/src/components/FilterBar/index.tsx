import { ArrowUpDown, X } from 'lucide-react'
import type { ProjectType } from '../../store/projectStore'

const ALL_TYPES: ProjectType[] = [
	'Object Detection',
	'Semantic Segmentation',
	'Instance Segmentation'
]

interface FilterBarProps {
	sort_order: 'newest' | 'oldest'
	project_type_filters: ProjectType[]
	on_sort_order_change: (order: 'newest' | 'oldest') => void
	on_project_type_filters_change: (filters: ProjectType[]) => void
	on_clear: () => void
	is_dark_mode: boolean
}

export function filter_bar({
	sort_order,
	project_type_filters,
	on_sort_order_change,
	on_project_type_filters_change,
	on_clear,
	is_dark_mode
}: FilterBarProps) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'

	const has_active_filters = project_type_filters.length > 0 || sort_order !== 'newest'

	const toggle_type = (type: ProjectType) => {
		if (project_type_filters.includes(type)) {
			on_project_type_filters_change(project_type_filters.filter((t) => t !== type))
		} else {
			on_project_type_filters_change([...project_type_filters, type])
		}
	}

	return (
		<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
			<div className="flex items-center gap-2">
				<ArrowUpDown size={14} className={text_muted} />
				<select
					value={sort_order}
					onChange={(e) => on_sort_order_change(e.target.value as 'newest' | 'oldest')}
					className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium outline-none cursor-pointer ${border_subtle} ${bg_card} ${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'}`}
				>
					<option value="newest">Newest First</option>
					<option value="oldest">Oldest First</option>
				</select>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				{ALL_TYPES.map((type) => {
					const is_active = project_type_filters.includes(type)
					return (
						<button
							key={type}
							onClick={() => toggle_type(type)}
							className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
								is_active
									? is_dark_mode
										? 'bg-zinc-700 text-zinc-100'
										: 'bg-zinc-200 text-zinc-900'
									: `${text_muted} hover:bg-zinc-100 dark:hover:bg-zinc-800`
							}`}
						>
							{type}
						</button>
					)
				})}
			</div>

			{has_active_filters && (
				<button
					onClick={on_clear}
					className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${is_dark_mode ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
				>
					<X size={12} />
					Clear Filters
				</button>
			)}
		</div>
	)
}
