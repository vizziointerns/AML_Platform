import { Search, LayoutGrid, List as ListIcon } from 'lucide-react'
import type { ProjectType } from '../../store/projectStore'

export function project_toolbar({
	search_query,
	on_search_change,
	filter_type,
	on_filter_change,
	sort_by,
	on_sort_change,
	view_mode,
	on_view_mode_change,
	text_heading,
	text_muted,
	border_subtle,
	bg_card
}: {
	search_query: string
	on_search_change: (v: string) => void
	filter_type: ProjectType | 'All'
	on_filter_change: (v: ProjectType | 'All') => void
	sort_by: string
	on_sort_change: (v: 'Updated' | 'Name' | 'Progress' | 'Oldest') => void
	view_mode: 'grid' | 'list'
	on_view_mode_change: (v: 'grid' | 'list') => void
	text_heading: string
	text_muted: string
	border_subtle: string
	bg_card: string
}) {
	return (
		<div className="flex items-center gap-3 flex-wrap">
			<div className="relative flex-1 min-w-[200px]">
				<Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
				<input
					type="text"
					placeholder="Search projects..."
					value={search_query}
					onChange={(e) => on_search_change(e.target.value)}
					className={`w-full pl-9 pr-4 py-2 rounded-lg border ${border_subtle} ${bg_card} ${text_heading} text-sm outline-none focus:ring-2 focus:ring-blue-500/50`}
				/>
			</div>
			<select
				value={filter_type}
				onChange={(e) => on_filter_change(e.target.value as ProjectType | 'All')}
				className={`px-3 py-2 rounded-lg border ${border_subtle} ${bg_card} ${text_heading} text-sm outline-none`}
			>
				<option value="All">All Types</option>
				<option value="Object Detection">Object Detection</option>
				<option value="Semantic Segmentation">Semantic Segmentation</option>
				<option value="Classification">Classification</option>
			</select>
			<select
				value={sort_by}
				onChange={(e) =>
					on_sort_change(e.target.value as 'Updated' | 'Name' | 'Progress' | 'Oldest')
				}
				className={`px-3 py-2 rounded-lg border ${border_subtle} ${bg_card} ${text_heading} text-sm outline-none`}
			>
				<option value="Updated">Last Updated</option>
				<option value="Name">Name</option>
				<option value="Progress">Progress</option>
				<option value="Oldest">Oldest</option>
			</select>
			<div className={`flex ${border_subtle} rounded-lg overflow-hidden`}>
				<button
					onClick={() => on_view_mode_change('grid')}
					className={`px-3 py-2 ${view_mode === 'grid' ? 'bg-blue-600 text-white' : text_muted}`}
				>
					<LayoutGrid size={16} />
				</button>
				<button
					onClick={() => on_view_mode_change('list')}
					className={`px-3 py-2 ${view_mode === 'list' ? 'bg-blue-600 text-white' : text_muted}`}
				>
					<ListIcon size={16} />
				</button>
			</div>
		</div>
	)
}
