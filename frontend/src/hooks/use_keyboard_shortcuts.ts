import { useEffect } from 'react'

export function use_keyboard_shortcuts(is_authenticated: boolean, on_toggle: () => void) {
	useEffect(() => {
		if (!is_authenticated) return

		const handle_key_down = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
				e.preventDefault()
				on_toggle()
			}
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault()
				console.info('Search triggered')
			}
		}

		window.addEventListener('keydown', handle_key_down)
		return () => window.removeEventListener('keydown', handle_key_down)
	}, [is_authenticated, on_toggle])
}
