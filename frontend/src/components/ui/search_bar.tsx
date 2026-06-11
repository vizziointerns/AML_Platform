import { Search, X } from 'lucide-react'

export function search_bar({
	value,
	on_change,
	placeholder = 'Search projects...',
	is_dark_mode
}: {
	value: string
	on_change: (value: string) => void
	placeholder?: string
	is_dark_mode: boolean
}) {
	return (
		<div className="relative flex-1 max-w-md">
			<Search
				size={16}
				className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
					is_dark_mode ? 'text-zinc-500' : 'text-zinc-400'
				}`}
			/>
			<input
				type="text"
				value={value}
				onChange={(e) => on_change(e.target.value)}
				placeholder={placeholder}
				className={`w-full rounded-lg border py-2 pl-10 pr-9 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/50 ${
					is_dark_mode
						? 'border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500'
						: 'border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500'
				}`}
			/>
			{value && (
				<button
					onClick={() => on_change('')}
					className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors ${
						is_dark_mode
							? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
							: 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
					}`}
				>
					<X size={16} />
				</button>
			)}
		</div>
	)
}
