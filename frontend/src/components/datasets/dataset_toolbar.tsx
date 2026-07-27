import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, Filter, LayoutGrid, List as ListIcon, Download, Plus, Check } from 'lucide-react'

const STATUS_OPTIONS = ['all', 'Processing', 'Completed'] as const
export type StatusFilter = (typeof STATUS_OPTIONS)[number]

function filter_dropdown({
	current,
	on_change,
	is_dark_mode
}: {
	current: StatusFilter
	on_change: (v: StatusFilter) => void
	is_dark_mode: boolean
}) {
	const [is_open, set_is_open] = useState(false)
	const [pos, set_pos] = useState<{ top: number; right: number } | undefined>(undefined)
	const btn_ref = useRef<HTMLButtonElement>(undefined!)
	const menu_ref = useRef<HTMLDivElement>(undefined!)

	useEffect(() => {
		if (!is_open) return
		const handler = (e: MouseEvent) => {
			const t = e.target as Node
			if (!btn_ref.current?.contains(t) && !menu_ref.current?.contains(t)) set_is_open(false)
		}
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [is_open])

	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'

	return (
		<>
			<button
				ref={btn_ref}
				onClick={() => {
					const will_open = !is_open
					if (will_open) {
						const r = btn_ref.current.getBoundingClientRect()
						set_pos({ top: r.bottom + 4, right: window.innerWidth - r.right })
					}
					set_is_open(will_open)
				}}
				className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${is_dark_mode ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
			>
				<Filter size={16} /> {current === 'all' ? 'Filter' : current}
			</button>
			{is_open &&
				pos &&
				createPortal(
					<div
						ref={menu_ref}
						style={{ position: 'fixed', top: pos.top, right: pos.right }}
						className={`w-40 rounded-lg border ${border_subtle} ${bg_card} shadow-lg z-50 py-1`}
					>
						{STATUS_OPTIONS.map((opt) => (
							<button
								key={opt}
								onClick={() => {
									on_change(opt)
									set_is_open(false)
								}}
								className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${text_heading} ${hover_bg}`}
							>
								<span className="w-4 shrink-0">
									{current === opt && <Check size={14} className="text-blue-500" />}
								</span>
								{opt === 'all' ? 'All Datasets' : opt}
							</button>
						))}
					</div>,
					document.body
				)}
		</>
	)
}

export function dataset_toolbar({
	search_query,
	on_search_change,
	view_mode,
	on_view_mode_change,
	is_dark_mode,
	on_import,
	on_create,
	status_filter,
	on_status_filter_change
}: {
	search_query: string
	on_search_change: (value: string) => void
	view_mode: 'grid' | 'list'
	on_view_mode_change: (mode: 'grid' | 'list') => void
	is_dark_mode: boolean
	on_import?: () => void
	on_create?: () => void
	status_filter?: StatusFilter
	on_status_filter_change?: (v: StatusFilter) => void
}) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'

	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'
	const actions_bar =
		on_import || on_create ? (
			<div className="flex gap-2">
				{on_import && (
					<button
						onClick={on_import}
						className={`flex items-center gap-2 px-4 py-2 font-medium rounded-md border ${border_subtle} ${bg_card} ${hover_bg} transition-colors text-sm`}
					>
						<Download size={16} /> Import
					</button>
				)}
				{on_create && (
					<button onClick={on_create} className="btn-primary">
						<Plus size={16} /> Create Dataset
					</button>
				)}
			</div>
		) : undefined

	const active_view_cls = (mode: 'grid' | 'list') =>
		view_mode === mode
			? is_dark_mode
				? 'bg-zinc-800 text-white'
				: 'bg-zinc-100 text-zinc-900'
			: is_dark_mode
				? 'text-zinc-400 hover:text-zinc-200'
				: 'text-zinc-500 hover:text-zinc-700'

	return (
		<>
			<div className="page-header mb-2">
				<div>
					<h1 className={`text-2xl font-semibold tracking-tight ${text_heading}`}>Datasets</h1>
					<p className={`text-sm mt-1 ${text_muted}`}>
						Manage your computer vision datasets and versions.
					</p>
				</div>
				{actions_bar}
			</div>

			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div
					className={`flex items-center px-3 py-2 rounded-lg border ${border_subtle} ${is_dark_mode ? 'bg-zinc-900' : 'bg-white'} w-full sm:w-80`}
				>
					<Search size={16} className={text_muted} />
					<input
						type="text"
						placeholder="Search datasets..."
						className={`bg-transparent border-none outline-none text-sm ml-2 w-full ${is_dark_mode ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}`}
						value={search_query}
						onChange={(e) => on_search_change(e.target.value)}
					/>
				</div>

				<div className="flex gap-2 shrink-0">
					{filter_dropdown({
						current: status_filter ?? 'all',
						on_change: on_status_filter_change ?? (() => {}),
						is_dark_mode
					})}
					<div
						className={`inline-flex rounded-lg border p-1 ${is_dark_mode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
					>
						<button
							onClick={() => on_view_mode_change('grid')}
							className={`p-1.5 rounded-md transition-colors ${active_view_cls('grid')}`}
						>
							<LayoutGrid size={16} />
						</button>
						<button
							onClick={() => on_view_mode_change('list')}
							className={`p-1.5 rounded-md transition-colors ${active_view_cls('list')}`}
						>
							<ListIcon size={16} />
						</button>
					</div>
				</div>
			</div>
		</>
	)
}
