import { useState, useEffect } from 'react'
import { Check, Maximize, X, PenTool } from 'lucide-react'
import type { MockImage } from './types'

export function gallery_image({
	img,
	global_index,
	is_selected,
	is_focused,
	item_width,
	virtual_row_size,
	is_dark_mode,
	set_focused_index,
	handle_select,
	set_preview_image,
	on_open_annotation
}: {
	img: MockImage
	global_index: number
	is_selected: boolean
	is_focused: boolean
	item_width: number
	virtual_row_size: number
	is_dark_mode: boolean
	set_focused_index: (i: number) => void
	handle_select: (id: number, shift_key: boolean) => void
	set_preview_image: (img: MockImage) => void
	on_open_annotation?: (img: MockImage) => void
}) {
	const [has_error, set_has_error] = useState(false)
	useEffect(() => {
		set_has_error(false)
	}, [img.url])
	const border_cls = is_selected
		? 'border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.2)] scale-[0.98]'
		: is_focused
			? `${is_dark_mode ? 'border-zinc-500' : 'border-zinc-400'}`
			: `${is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'} hover:border-zinc-400 dark:hover:border-zinc-600`

	return (
		<div
			key={img.id}
			style={{ width: `${item_width}px`, height: `${virtual_row_size}px`, padding: '6px' }}
		>
			<div
				onClick={(e) => {
					e.stopPropagation()
					set_focused_index(global_index)
					handle_select(img.id, e.shiftKey)
				}}
				onDoubleClick={() => set_preview_image(img)}
				className={`w-full h-full relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden group ${border_cls}`}
			>
				{has_error ? (
					<div className="absolute inset-0 flex items-center justify-center text-zinc-400 dark:text-zinc-600 text-xs bg-zinc-100 dark:bg-zinc-900 rounded-xl">
						No preview
					</div>
				) : (
					<img
						src={img.url}
						alt={`Img ${img.id}`}
						loading="lazy"
						onError={() => set_has_error(true)}
						className="absolute inset-0 w-full h-full object-cover bg-zinc-100 dark:bg-zinc-900"
					/>
				)}

				{is_focused && (
					<div className="absolute inset-0 ring-4 ring-inset ring-white/30 dark:ring-white/20 pointer-events-none" />
				)}

				<div className="absolute top-2 right-2">
					{img.status === 'unannotated' && (
						<div
							className="w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white dark:border-zinc-900 shadow-sm"
							title="Unannotated"
						></div>
					)}
				</div>

				<div
					className={`absolute inset-0 transition-all duration-200 ${is_selected ? 'bg-blue-500/10' : 'bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-black/20'}`}
				>
					<div
						className={`absolute top-2 left-2 transition-opacity duration-200 ${is_selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
					>
						<div
							className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${is_selected ? 'bg-blue-600' : 'bg-white/90 dark:bg-zinc-800/90 shadow-sm border border-black/10 dark:border-white/10'}`}
						>
							{is_selected && <Check size={14} className="text-white" />}
						</div>
					</div>
				</div>

				<div className="absolute top-2 right-12 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
					<button
						onClick={(e) => {
							e.stopPropagation()
							on_open_annotation?.(img)
						}}
						className="p-1 rounded bg-blue-600/80 text-white hover:bg-blue-700 backdrop-blur-md"
						title="Annotate"
					>
						<PenTool size={14} />
					</button>
					<button
						onClick={(e) => {
							e.stopPropagation()
							set_preview_image(img)
						}}
						className="p-1 rounded bg-black/50 text-white hover:bg-black/70 backdrop-blur-md"
					>
						<Maximize size={14} />
					</button>
				</div>

				<div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 pointer-events-none">
					{img.classes.map((c: string) => (
						<span
							key={c}
							className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-900/80 text-white backdrop-blur-md border border-white/10 shadow-sm max-w-full truncate"
						>
							{c}
						</span>
					))}
				</div>
			</div>
		</div>
	)
}

export function render_preview_modal(
	preview_image: MockImage | undefined,
	set_preview_image: (img: MockImage | undefined) => void
) {
	if (!preview_image) return undefined
	return (
		<div
			className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 animate-in fade-in duration-200"
			onClick={() => set_preview_image(undefined)}
		>
			<div className="absolute top-4 right-4 flex gap-2">
				<button
					onClick={() => set_preview_image(undefined)}
					className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
				>
					<X size={20} />
				</button>
			</div>
			<div
				className="max-w-6xl w-full max-h-screen flex flex-col items-center"
				onClick={(e) => e.stopPropagation()}
			>
				<img
					src={preview_image.url}
					alt="Preview"
					className="max-h-[80vh] w-auto rounded-lg shadow-2xl object-contain drop-shadow-2xl"
					onError={(e) => {
						const el = e.currentTarget as HTMLImageElement
						el.style.display = 'none'
						const parent = el.parentElement
						if (parent) {
							const fallback = parent.querySelector('.preview-fallback') as HTMLElement | null
							if (fallback) fallback.style.display = 'flex'
						}
					}}
				/>
				<div className="preview-fallback hidden max-h-[80vh] w-96 rounded-lg border-2 border-dashed border-zinc-700 items-center justify-center text-zinc-500 text-sm p-12">
					Image preview not available
				</div>
				<div className="mt-6 flex flex-wrap justify-center gap-2">
					{preview_image.classes.map((c: string) => (
						<span
							key={c}
							className="px-3 py-1.5 rounded-md text-sm font-medium bg-white/10 text-white border border-white/20"
						>
							{c}
						</span>
					))}
					<span
						className={`px-3 py-1.5 rounded-md text-sm font-medium border border-white/20 ${preview_image.status === 'unannotated' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}
					>
						Status: {preview_image.status}
					</span>
					<span className="px-3 py-1.5 rounded-md text-sm font-medium bg-white/10 text-white border border-white/20 opacity-60">
						ID: {preview_image.id}
					</span>
				</div>
			</div>
		</div>
	)
}
