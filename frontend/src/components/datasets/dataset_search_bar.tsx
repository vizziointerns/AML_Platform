import { Search, X } from 'lucide-react'

export function dataset_search_bar({
	search_query,
	on_search_change,
	is_dark_mode
}: {
	search_query: string
	on_search_change: (value: string) => void
	is_dark_mode: boolean
}) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'

	return (
		<div className={`sticky top-0 z-40 pt-4 pb-3 ${is_dark_mode ? 'bg-[#09090b]' : 'bg-zinc-50'}`}>
			<div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
				<div
					className={`flex items-center px-3 py-2 rounded-lg border ${border_subtle} ${bg_card} w-full sm:w-72`}
				>
					<Search size={16} className={text_muted} />
					<input
						type="text"
						placeholder="Search datasets..."
						className={`bg-transparent border-none outline-none text-sm ml-2 w-full ${is_dark_mode ? 'text-white' : 'text-zinc-900'}`}
						value={search_query}
						onChange={(e) => on_search_change(e.target.value)}
					/>
					{search_query && (
						<button
							onClick={() => on_search_change('')}
							className={`p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 ${text_muted}`}
						>
							<X size={14} />
						</button>
					)}
				</div>
			</div>
		</div>
	)
}
