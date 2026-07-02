import type { Annotation, ClassInfo, Mode, Prediction } from './types'

const CLASSES_STORAGE_KEY = 'annotation_classes'

export function load_classes(): ClassInfo[] {
	try {
		const raw = localStorage.getItem(CLASSES_STORAGE_KEY)
		if (!raw) return []
		const parsed = JSON.parse(raw)
		if (!Array.isArray(parsed)) return []
		return parsed.filter(
			(item): item is ClassInfo =>
				item &&
				typeof item === 'object' &&
				typeof item.id === 'string' &&
				typeof item.name === 'string' &&
				typeof item.color === 'string'
		)
	} catch {
		/* ignore */
	}
	return []
}

export function save_classes(classes: ClassInfo[]): void {
	try {
		localStorage.setItem(CLASSES_STORAGE_KEY, JSON.stringify(classes))
	} catch {
		/* ignore */
	}
}

export function handle_mode_shortcut(
	key: string,
	set_active_tool: (t: Mode) => void,
	e?: KeyboardEvent
): boolean {
	const modes: Record<string, Mode> = {
		v: 'select',
		h: 'pan',
		b: 'bbox',
		p: 'polygon',
		w: 'brush',
		e: 'eraser',
		s: 'segment'
	}
	if (key === 's' && e && (e.ctrlKey || e.metaKey)) {
		return false
	}
	if (modes[key]) {
		set_active_tool(modes[key])
		return true
	}
	return false
}

export function handle_brush_size_shortcut(
	key: string,
	set_brush_size: (fn: (s: number) => number) => void
): boolean {
	if (key === '[') {
		set_brush_size((s) => Math.max(1, s - 5))
		return true
	}
	if (key === ']') {
		set_brush_size((s) => Math.min(100, s + 5))
		return true
	}
	return false
}

export function handle_zoom_level_shortcut(
	key: string,
	set_zoom_level: (fn: (z: number) => number) => void
): boolean {
	if (key === '=' || key === '+') {
		set_zoom_level((z) => Math.min(z + 0.5, 10))
		return true
	}
	if (key === '-') {
		set_zoom_level((z) => Math.max(z - 0.5, 0.5))
		return true
	}
	return false
}

export function handle_delete_shortcut(
	key: string,
	selected_ann_id: string | undefined,
	selected_prediction_id: string | undefined,
	set_annotations: (fn: (prev: Annotation[]) => Annotation[]) => void,
	set_predictions: (fn: (prev: Prediction[]) => Prediction[]) => void,
	set_selected_ann_id: (id: string | undefined) => void,
	set_selected_prediction_id: (id: string | undefined) => void
): boolean {
	if (key !== 'delete' && key !== 'backspace') return false
	if (selected_ann_id) {
		set_annotations((prev) => prev.filter((a) => a.id !== selected_ann_id))
		set_selected_ann_id(undefined)
	}
	if (selected_prediction_id) {
		set_predictions((prev) => prev.filter((p) => p.id !== selected_prediction_id))
		set_selected_prediction_id(undefined)
	}
	return true
}

export function handle_undo_redo_shortcut(
	key: string,
	e: KeyboardEvent,
	undo: () => void,
	redo: () => void
): void {
	const is_mod = e.ctrlKey || e.metaKey
	if (key === 'z' && is_mod) {
		e.preventDefault()
		if (e.shiftKey) redo()
		else undo()
	}
	if (key === 'y' && is_mod) {
		e.preventDefault()
		redo()
	}
}

export function compute_theme_classes(isDarkMode: boolean) {
	return {
		text_muted: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
		text_heading: isDarkMode ? 'text-zinc-100' : 'text-zinc-900',
		border_subtle: isDarkMode ? 'border-zinc-800' : 'border-zinc-200',
		bg_main: isDarkMode ? 'bg-[#09090b]' : 'bg-white',
		bg_panel: isDarkMode ? 'bg-zinc-950' : 'bg-zinc-50',
		bg_hover: isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200',
		bg_workspace: isDarkMode ? 'bg-[#18181b]' : 'bg-zinc-200/50'
	}
}

export function theme_get_class_color(classes: ClassInfo[], id: string) {
	return classes.find((c) => c.id === id)?.color || '#9ca3af'
}

export function theme_get_class_name(classes: ClassInfo[], id: string) {
	return classes.find((c) => c.id === id)?.name || id
}

export function theme_current_count(id: string, annotations: Annotation[]) {
	return annotations.filter((a) => a.classId === id).length
}

const CLASS_COLORS = [
	'#3b82f6',
	'#10b981',
	'#f59e0b',
	'#8b5cf6',
	'#ef4444',
	'#ec4899',
	'#14b8a6',
	'#f97316',
	'#06b6d4',
	'#84cc16',
	'#a855f7',
	'#e11d48',
	'#0ea5e9',
	'#d946ef',
	'#22c55e'
]

export function generate_class_color(classes: ClassInfo[]): string {
	const used = new Set(classes.map((c) => c.color))
	for (const color of CLASS_COLORS) {
		if (!used.has(color)) return color
	}
	let c = '#'
	for (let i = 0; i < 6; i++) c += '0123456789abcdef'[Math.floor(Math.random() * 16)]
	return c
}

export function class_create(name: string, classes: ClassInfo[], color?: string): ClassInfo {
	const id = name.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '_' + crypto.randomUUID().slice(0, 8)
	return { id, name, color: color || generate_class_color(classes) }
}

export function class_rename(classes: ClassInfo[], id: string, new_name: string): ClassInfo[] {
	return classes.map((c) => (c.id === id ? { ...c, name: new_name } : c))
}

export function class_delete(
	id: string,
	classes: ClassInfo[],
	annotations: Annotation[]
): { updated_classes: ClassInfo[]; affected_annotation_ids: string[] } {
	const affected = annotations.filter((a) => a.classId === id).map((a) => a.id)
	return {
		updated_classes: classes.filter((c) => c.id !== id),
		affected_annotation_ids: affected
	}
}

export function handle_class_shortcut(
	key: string,
	classes: ClassInfo[],
	set_active_class: (id: string) => void
): boolean {
	const num = parseInt(key, 10)
	if (num >= 1 && num <= 9 && num <= classes.length) {
		set_active_class(classes[num - 1]!.id)
		return true
	}
	return false
}
