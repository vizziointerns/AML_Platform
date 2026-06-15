import { Search } from 'lucide-react'

interface SearchBarProps {
	value: string
	on_change: (value: string) => void
	is_dark_mode: boolean
	placeholder?: string
}

export function search_bar({
	value,
	on_change,
	is_dark_mode,
	placeholder = 'Search projects...'
}: SearchBarProps) {
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'

	return (
		<div className="space-y-3">
			<h3 className={`text-sm font-semibold tracking-tight ${text_heading}`}>Search Projects</h3>
			<div className="relative flex-1 min-w-[200px]">
				<Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
				<input
					type="text"
					placeholder={placeholder}
					value={value}
					onChange={(e) => on_change(e.target.value)}
					className={`w-full pl-9 pr-4 py-2 rounded-lg border ${border_subtle} ${bg_card} ${text_heading} text-sm outline-none focus:ring-2 focus:ring-blue-500/50`}
				/>
			</div>
			<p className={`text-xs ${text_muted}`}>Search filters both pinned and unpinned projects.</p>
		</div>
	)
}
