import { Copy } from 'lucide-react'

export function duplicate_button({
	on_duplicate,
	is_dark_mode
}: {
	on_duplicate: () => void
	is_dark_mode: boolean
}) {
	return (
		<button
			onClick={(e) => {
				e.stopPropagation()
				on_duplicate()
			}}
			title="Duplicate project"
			className={`rounded p-1 transition-colors ${
				is_dark_mode ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-300 hover:text-zinc-500'
			}`}
		>
			<Copy size={14} />
		</button>
	)
}
