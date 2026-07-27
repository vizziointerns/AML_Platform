import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Filter, Check } from 'lucide-react'

export type StatusFilter = 'all' | 'annotated' | 'unannotated'

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
	{ value: 'all', label: 'All Images' },
	{ value: 'annotated', label: 'Annotated' },
	{ value: 'unannotated', label: 'Unannotated' }
]

interface FilterBarProps {
	current: StatusFilter
	onChange: (filter: StatusFilter) => void
	is_dark_mode: boolean
}

export function filter_bar({ current, onChange, is_dark_mode }: FilterBarProps) {
	const [is_open, set_is_open] = useState(false)
	const [position, set_position] = useState<{ top: number; right: number } | undefined>(undefined)
	const btn_ref = useRef<HTMLButtonElement>(undefined!)
	const menu_ref = useRef<HTMLDivElement>(undefined!)

	useEffect(() => {
		if (!is_open) return
		const recalc = () => {
			const rect = btn_ref.current?.getBoundingClientRect()
			if (rect) set_position({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
		}
		const on_mousedown = (e: MouseEvent) => {
			const t = e.target as Node
			if (!btn_ref.current?.contains(t) && !menu_ref.current?.contains(t)) set_is_open(false)
		}
		document.addEventListener('mousedown', on_mousedown)
		window.addEventListener('resize', recalc)
		window.addEventListener('scroll', recalc, { capture: true, passive: true })
		return () => {
			document.removeEventListener('mousedown', on_mousedown)
			window.removeEventListener('resize', recalc)
			window.removeEventListener('scroll', recalc, { capture: true } as EventListenerOptions)
		}
	}, [is_open])

	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'

	return (
		<>
			<button
				ref={btn_ref}
				onClick={() => {
					const will_open = !is_open
					if (will_open) {
						const rect = btn_ref.current.getBoundingClientRect()
						set_position({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
					}
					set_is_open(will_open)
				}}
				className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border ${border_subtle} bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${text_heading}`}
			>
				<Filter size={16} />
				{FILTER_OPTIONS.find((o) => o.value === current)?.label}
			</button>
			{is_open &&
				position &&
				createPortal(
					<div
						ref={menu_ref}
						style={{ position: 'fixed', top: position.top, right: position.right }}
						className={`w-40 rounded-lg border ${border_subtle} ${bg_card} shadow-lg z-50 py-1`}
					>
						{FILTER_OPTIONS.map((option) => (
							<button
								key={option.value}
								onClick={() => {
									onChange(option.value)
									set_is_open(false)
								}}
								className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${text_heading} ${hover_bg}`}
							>
								<span className="w-4 shrink-0">
									{current === option.value && <Check size={14} className="text-blue-500" />}
								</span>
								{option.label}
							</button>
						))}
					</div>,
					document.body
				)}
		</>
	)
}
