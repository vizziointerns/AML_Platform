import React, { useRef } from 'react'
import {
	Hash,
	ChevronDown,
	ChevronRight,
	Plus,
	Check,
	Pencil,
	Trash2,
	type LucideProps
} from 'lucide-react'
import type { Annotation, ClassInfo, Mode } from './types'

function item_bg(is_active: boolean, isDarkMode: boolean): string {
	if (is_active) return isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-blue-50 border-blue-200'
	if (isDarkMode) return 'border-transparent hover:bg-zinc-900 hover:border-zinc-800'
	return 'border-transparent hover:bg-zinc-100 hover:border-zinc-200'
}

function render_class_item(
	c: ClassInfo,
	idx: number,
	active_class: string,
	set_active_class: (id: string) => void,
	isDarkMode: boolean,
	border_subtle: string,
	text_heading: string,
	text_muted: string,
	delete_class_id: string | undefined,
	handle_delete_class: (id: string) => void,
	set_delete_class_id: (id: string | undefined) => void,
	renaming_class_id: string | undefined,
	handle_rename_class: (id: string, new_name: string) => void,
	set_renaming_class_id: (id: string | undefined) => void,
	theme_current_count_fn: (id: string, annotations: Annotation[]) => number,
	annotations: Annotation[]
) {
	const is_renaming = renaming_class_id === c.id
	const shortcut = idx < 9 ? idx + 1 : undefined
	const is_active = active_class === c.id
	const bg_cls = item_bg(is_active, isDarkMode)

	if (delete_class_id === c.id) {
		return (
			<div key={c.id} className={`w-full rounded-md transition-all border ${bg_cls}`}>
				<div className={`p-2 space-y-2 ${isDarkMode ? 'bg-red-950/30' : 'bg-red-50'} rounded-md`}>
					<p className={`text-[11px] ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
						Delete "{c.name}"? Annotations will become unassigned.
					</p>
					<div className="flex gap-2">
						<button
							onClick={() => handle_delete_class(c.id)}
							className="flex-1 px-2 py-1 text-[10px] rounded bg-red-600 text-white hover:bg-red-500 transition-colors font-medium"
						>
							Delete
						</button>
						<button
							onClick={() => set_delete_class_id(undefined)}
							className={`flex-1 px-2 py-1 text-[10px] rounded border ${border_subtle} ${text_muted} ${isDarkMode ? 'hover:text-zinc-100' : 'hover:text-zinc-900'} transition-colors`}
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		)
	}

	if (is_renaming) {
		return (
			<div key={c.id} className={`w-full rounded-md transition-all border ${bg_cls}`}>
				<div className="flex items-center gap-1 p-2">
					<input
						autoFocus
						type="text"
						defaultValue={c.name}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && e.currentTarget.value.trim()) {
								handle_rename_class(c.id, e.currentTarget.value.trim())
							}
							if (e.key === 'Escape') set_renaming_class_id(undefined)
						}}
						onBlur={(e) => {
							if (e.currentTarget.value.trim()) {
								handle_rename_class(c.id, e.currentTarget.value.trim())
							} else {
								set_renaming_class_id(undefined)
							}
						}}
						className={`flex-1 bg-transparent border rounded px-2 py-1 text-xs outline-none ${isDarkMode ? 'border-zinc-700 text-zinc-100' : 'border-zinc-300 text-zinc-900'} ${text_heading}`}
					/>
					<button
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => {
							const el = document.activeElement as HTMLInputElement | null
							if (el?.value?.trim()) handle_rename_class(c.id, el.value.trim())
							else set_renaming_class_id(undefined)
						}}
						className="p-1 hover:text-blue-500 transition-colors"
					>
						<Check size={14} />
					</button>
				</div>
			</div>
		)
	}

	return (
		<div key={c.id} className={`group w-full rounded-md transition-all border ${bg_cls}`}>
			<div className="flex items-center justify-between p-2">
				<button
					onClick={() => set_active_class(c.id)}
					className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
				>
					{shortcut !== undefined && (
						<kbd
							className={`text-[10px] font-mono px-1 py-0.5 rounded ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-500'}`}
						>
							{shortcut}
						</kbd>
					)}
					<div
						className={`w-3 h-3 rounded-[3px] border ${isDarkMode ? 'border-white/20' : 'border-black/10'} shadow-sm flex items-center justify-center shrink-0`}
						style={{ backgroundColor: c.color }}
					>
						{is_active && <div className="w-1 h-1 bg-white rounded-full"></div>}
					</div>
					<span className={`text-sm ${is_active ? text_heading : text_muted} font-medium truncate`}>
						{c.name}
					</span>
				</button>
				<div className="flex items-center gap-1 shrink-0">
					<span
						className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-zinc-900 text-zinc-500' : 'bg-white text-zinc-400'}`}
					>
						{theme_current_count_fn(c.id, annotations)}
					</span>
					<button
						onClick={(e) => {
							e.stopPropagation()
							set_renaming_class_id(c.id)
						}}
						className={`p-1 rounded opacity-0 group-hover:opacity-100 ${isDarkMode ? 'hover:text-zinc-100' : 'hover:text-zinc-900'} ${text_muted} transition-all`}
						title="Rename"
					>
						<Pencil size={12} />
					</button>
					<button
						onClick={(e) => {
							e.stopPropagation()
							set_delete_class_id(c.id)
						}}
						className={`p-1 rounded opacity-0 group-hover:opacity-100 hover:text-red-500 ${text_muted} transition-all`}
						title="Delete"
					>
						<Trash2 size={12} />
					</button>
				</div>
			</div>
		</div>
	)
}

export function render_left_panel(
	left_width: number,
	border_subtle: string,
	bg_panel: string,
	tools: readonly { id: Mode; icon: React.ComponentType<LucideProps>; label: string }[],
	active_tool: string,
	set_active_tool: (tool: Mode) => void,
	isDarkMode: boolean,
	brush_size: number,
	set_brush_size: (size: number) => void,
	brush_opacity: number,
	set_brush_opacity: (opacity: number) => void,
	is_classes_open: boolean,
	set_is_classes_open: (open: boolean) => void,
	text_heading: string,
	text_muted: string,
	bg_hover: string,
	classes: ClassInfo[],
	active_class: string,
	set_active_class: (cls: string) => void,
	annotations: Annotation[],
	is_dragging_left: React.MutableRefObject<boolean>,
	theme_current_count_fn: (id: string, annotations: Annotation[]) => number,
	handle_create_class: (name: string, color?: string) => void,
	handle_rename_class: (id: string, new_name: string) => void,
	handle_delete_class: (id: string) => void,
	renaming_class_id: string | undefined,
	set_renaming_class_id: (id: string | undefined) => void,
	delete_class_id: string | undefined,
	set_delete_class_id: (id: string | undefined) => void,
	new_class_name: string,
	set_new_class_name: (name: string) => void
) {
	const input_ref = useRef<HTMLInputElement>(undefined!)

	const on_create = () => {
		const name = new_class_name.trim()
		if (name) {
			handle_create_class(name)
			set_new_class_name('')
		}
	}

	return (
		<div
			style={{ width: left_width }}
			className={`shrink-0 border-r ${border_subtle} ${bg_panel} flex flex-col z-10 relative`}
		>
			<div className={`p-3 border-b ${border_subtle} flex flex-wrap gap-2`}>
				{tools.map((tool) => (
					<button
						key={tool.id}
						onClick={() => set_active_tool(tool.id)}
						title={tool.label}
						className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${active_tool === tool.id ? 'bg-blue-600 text-white shadow-sm' : `${bg_hover} ${text_muted} ${isDarkMode ? 'hover:text-zinc-100' : 'hover:text-zinc-900'}`}`}
					>
						<tool.icon size={18} />
					</button>
				))}
			</div>
			{(active_tool === 'brush' || active_tool === 'eraser') && (
				<div className={`p-4 border-b ${border_subtle} space-y-4`}>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label className={`text-xs font-semibold ${text_heading}`}>Brush Size</label>
							<span className={`text-xs ${text_muted}`}>{brush_size}px</span>
						</div>
						<input
							type="range"
							min="1"
							max="100"
							value={brush_size}
							onChange={(e) => set_brush_size(parseInt(e.target.value))}
							className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
						/>
					</div>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label className={`text-xs font-semibold ${text_heading}`}>Mask Opacity</label>
							<span className={`text-xs ${text_muted}`}>{brush_opacity}%</span>
						</div>
						<input
							type="range"
							min="0"
							max="100"
							value={brush_opacity}
							onChange={(e) => set_brush_opacity(parseInt(e.target.value))}
							className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
						/>
					</div>
				</div>
			)}
			<div className="flex-1 flex flex-col min-h-0">
				<button
					onClick={() => set_is_classes_open(!is_classes_open)}
					className={`flex items-center justify-between p-3 border-b ${border_subtle} ${isDarkMode ? 'hover:bg-zinc-900' : 'hover:bg-zinc-100'} transition-colors w-full text-left`}
				>
					<div
						className={`flex items-center gap-2 text-sm font-semibold tracking-tight ${text_heading}`}
					>
						<Hash size={16} className={text_muted} /> Classes
					</div>
					{is_classes_open ? (
						<ChevronDown size={14} className={text_muted} />
					) : (
						<ChevronRight size={14} className={text_muted} />
					)}
				</button>
				{is_classes_open && (
					<div className="flex-1 overflow-y-auto p-2 space-y-1">
						<div className="px-2 pb-2">
							<div
								className={`flex items-center px-2 py-1.5 rounded border ${border_subtle} ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}
							>
								<Plus size={14} className={text_muted} />
								<input
									ref={input_ref}
									type="text"
									placeholder="Add class..."
									value={new_class_name}
									onChange={(e) => set_new_class_name(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') on_create()
									}}
									className={`bg-transparent outline-none text-xs ml-2 w-full ${text_heading}`}
								/>
								{new_class_name.trim() && (
									<button
										onClick={on_create}
										className="p-0.5 hover:text-blue-500 transition-colors"
									>
										<Check size={14} />
									</button>
								)}
							</div>
						</div>
						{classes.map((c, idx) =>
							render_class_item(
								c,
								idx,
								active_class,
								set_active_class,
								isDarkMode,
								border_subtle,
								text_heading,
								text_muted,
								delete_class_id,
								handle_delete_class,
								set_delete_class_id,
								renaming_class_id,
								handle_rename_class,
								set_renaming_class_id,
								theme_current_count_fn,
								annotations
							)
						)}
					</div>
				)}
			</div>
			<div
				className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-20"
				onMouseDown={() => {
					is_dragging_left.current = true
					document.body.style.cursor = 'col-resize'
				}}
			/>
		</div>
	)
}
