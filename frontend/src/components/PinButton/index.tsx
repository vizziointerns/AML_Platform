import { Pin, PinOff } from 'lucide-react'

export function pin_button({
	is_pinned,
	on_toggle,
	is_dark_mode
}: {
	is_pinned: boolean
	on_toggle: () => void
	is_dark_mode: boolean
}) {
	return (
		<button
			onClick={(e) => {
				e.stopPropagation()
				on_toggle()
			}}
			title={is_pinned ? 'Unpin project' : 'Pin project'}
			className={`rounded p-1 transition-colors ${
				is_pinned
					? 'text-blue-500 hover:text-blue-400'
					: is_dark_mode
						? 'text-zinc-600 hover:text-zinc-400'
						: 'text-zinc-300 hover:text-zinc-500'
			}`}
		>
			{is_pinned ? <Pin size={14} fill="currentColor" /> : <PinOff size={14} />}
		</button>
	)
}
