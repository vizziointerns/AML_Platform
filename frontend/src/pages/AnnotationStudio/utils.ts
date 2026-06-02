import type { Annotation, ClassInfo, Mode, Prediction } from './types'

export function handle_mode_shortcut(key: string, set_active_tool: (t: Mode) => void): boolean {
	const modes: Record<string, Mode> = { v: 'select', h: 'pan', b: 'bbox', p: 'polygon', w: 'brush', e: 'eraser' }
	if (modes[key]) { set_active_tool(modes[key]); return true }
	return false
}

export function handle_brush_size_shortcut(key: string, set_brush_size: (fn: (s: number) => number) => void): boolean {
	if (key === '[') { set_brush_size((s) => Math.max(1, s - 5)); return true }
	if (key === ']') { set_brush_size((s) => Math.min(100, s + 5)); return true }
	return false
}

export function handle_zoom_level_shortcut(key: string, set_zoom_level: (fn: (z: number) => number) => void): boolean {
	if (key === '=' || key === '+') { set_zoom_level((z) => Math.min(z + 0.5, 10)); return true }
	if (key === '-') { set_zoom_level((z) => Math.max(z - 0.5, 0.5)); return true }
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

export function handle_undo_redo_shortcut(key: string, e: KeyboardEvent, undo: () => void, redo: () => void): void {
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
