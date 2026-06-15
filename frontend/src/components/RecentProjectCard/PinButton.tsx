import { Pin } from 'lucide-react'

interface PinButtonProps {
	is_pinned: boolean
	is_dark_mode: boolean
	on_toggle: () => void
}

export function pin_button({ is_pinned, is_dark_mode, on_toggle }: PinButtonProps) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'

	return (
		<button
			onClick={(e) => {
				e.stopPropagation()
				on_toggle()
			}}
			className={`p-1.5 rounded-md transition-colors ${
				is_pinned ? 'text-yellow-500 hover:text-yellow-400' : `${text_muted} hover:text-yellow-500`
			} ${is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
			title={is_pinned ? 'Unpin project' : 'Pin project'}
		>
			<Pin size={14} fill={is_pinned ? 'currentColor' : 'none'} />
		</button>
	)
}
