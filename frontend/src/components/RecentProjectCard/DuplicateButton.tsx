import { useState, useRef, useCallback } from 'react'
import { Copy, Loader2 } from 'lucide-react'

interface DuplicateButtonProps {
	project_id: string
	on_duplicate: (project_id: string) => void
	is_dark_mode: boolean
}

export function duplicate_button({ project_id, on_duplicate, is_dark_mode }: DuplicateButtonProps) {
	const [is_loading, set_is_loading] = useState(false)
	// Guard against rapid double-clicks by tracking the async operation separately
	const is_loading_ref = useRef(false)

	const handle_click = useCallback(
		async (e: React.MouseEvent) => {
			e.stopPropagation()
			if (is_loading_ref.current) return
			is_loading_ref.current = true
			set_is_loading(true)
			try {
				await on_duplicate(project_id)
			} finally {
				is_loading_ref.current = false
				set_is_loading(false)
			}
		},
		[project_id, on_duplicate]
	)

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'

	return (
		<button
			onClick={handle_click}
			disabled={is_loading}
			className={`p-1.5 rounded-md ${text_muted} hover:text-blue-500 ${is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
			title="Duplicate project"
		>
			{is_loading ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
		</button>
	)
}
