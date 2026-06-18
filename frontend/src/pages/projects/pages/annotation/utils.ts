import { useState, useEffect, useCallback } from 'react'
import type { Annotation, ClassInfo, Mode, Prediction } from './types'
import type { DatasetImage } from '../../../../hooks/use_dataset_images'
import { use_datasets } from '../../../../hooks/use_datasets'
import { use_dataset_images } from '../../../../hooks/use_dataset_images'

const CLASSES_STORAGE_KEY = 'annotation_classes'

export function load_classes(): ClassInfo[] {
	try {
		const raw = localStorage.getItem(CLASSES_STORAGE_KEY)
		if (raw) return JSON.parse(raw) as ClassInfo[]
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

export function handle_mode_shortcut(key: string, set_active_tool: (t: Mode) => void): boolean {
	const modes: Record<string, Mode> = {
		v: 'select',
		h: 'pan',
		b: 'bbox',
		p: 'polygon',
		w: 'brush',
		e: 'eraser'
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
	const id = name.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '_' + Date.now().toString(36)
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

export interface UseAnnotationImageResult {
	is_loading: boolean
	has_no_data: boolean
	image_url: string
	file_name: string
	image_width: number
	image_height: number
	dataset_images: DatasetImage[]
	active_image_index: number
	total_images: number
	go_to_prev_image: () => void
	go_to_next_image: () => void
	go_to_image: (index: number) => void
}

function first_valid_str(...values: (string | undefined | null)[]): string {
	for (const v of values) {
		if (v) return v
	}
	return ''
}

function first_valid_num(...values: (number | undefined | null)[]): number {
	for (const v of values) {
		if (v) return v
	}
	return 0
}

export function use_annotation_image(
	project_id: string | undefined,
	prop_dataset_id: string | undefined,
	prop_image_id: string | undefined,
	prop_image_url: string | undefined,
	prop_file_name: string | undefined,
	prop_image_width: number | undefined,
	prop_image_height: number | undefined,
	location_state: Record<string, unknown> | undefined
): UseAnnotationImageResult {
	const { datasets, is_loading: is_datasets_loading } = use_datasets(project_id)

	const from_state = location_state as Record<string, unknown> | undefined

	const state_ds = from_state?.dataset_id
	const resolved_dataset_id = first_valid_str(prop_dataset_id, state_ds as string | undefined)
	const first_dataset = datasets[0]
	const target_id = first_valid_str(resolved_dataset_id, first_dataset?.id)

	const { images: dataset_images, is_loading: is_images_loading } = use_dataset_images(target_id)

	const [active_image_index, set_active_image_index] = useState(0)

	const state_image_id = from_state?.image_id
	const target_image_id = first_valid_str(prop_image_id, state_image_id as string | undefined)

	useEffect(() => {
		if (!target_image_id || !dataset_images.length) {
			set_active_image_index(0)
			return
		}
		const idx = dataset_images.findIndex((img) => img.id === target_image_id)
		if (idx >= 0) {
			set_active_image_index(idx)
		} else {
			set_active_image_index(0)
		}
	}, [dataset_images, target_image_id])

	const active_image = dataset_images[active_image_index]

	const state_url = from_state?.image_url
	const state_name = from_state?.file_name
	const state_w = from_state?.image_width
	const state_h = from_state?.image_height

	const image_url = first_valid_str(
		active_image?.file_url,
		prop_image_url,
		state_url as string | undefined
	)
	const file_name = first_valid_str(
		active_image?.file_name,
		prop_file_name,
		state_name as string | undefined
	)
	const image_width = first_valid_num(
		active_image?.width,
		prop_image_width,
		state_w as number | undefined
	)
	const image_height = first_valid_num(
		active_image?.height,
		prop_image_height,
		state_h as number | undefined
	)

	const has_no_data = image_url === '' && !is_datasets_loading && !is_images_loading
	const is_loading = image_url === '' && !has_no_data

	const go_to_prev_image = useCallback(() => {
		set_active_image_index((prev) => Math.max(0, prev - 1))
	}, [])

	const go_to_next_image = useCallback(() => {
		set_active_image_index((prev) => Math.min(dataset_images.length - 1, prev + 1))
	}, [dataset_images.length])

	const go_to_image = useCallback((index: number) => {
		set_active_image_index(index)
	}, [])

	return {
		is_loading,
		has_no_data,
		image_url,
		file_name,
		image_width,
		image_height,
		dataset_images,
		active_image_index,
		total_images: dataset_images.length,
		go_to_prev_image,
		go_to_next_image,
		go_to_image
	}
}

export function use_keyboard_shortcuts(
	set_active_tool: (t: Mode) => void,
	set_brush_size: (fn: (s: number) => number) => void,
	set_zoom_level: (fn: (z: number) => number) => void,
	selected_ann_id: string | undefined,
	selected_prediction_id: string | undefined,
	set_annotations: (fn: (prev: Annotation[]) => Annotation[]) => void,
	set_predictions: (fn: (prev: Prediction[]) => Prediction[]) => void,
	set_selected_ann_id: (id: string | undefined) => void,
	set_selected_prediction_id: (id: string | undefined) => void,
	classes: ClassInfo[],
	set_active_class: (id: string) => void,
	undo: () => void,
	redo: () => void
) {
	useEffect(() => {
		const handle_key_down = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
			const key = e.key.toLowerCase()
			if (handle_mode_shortcut(key, set_active_tool)) return
			if (handle_brush_size_shortcut(key, set_brush_size)) return
			if (handle_zoom_level_shortcut(key, set_zoom_level)) return
			if (
				handle_delete_shortcut(
					key,
					selected_ann_id,
					selected_prediction_id,
					set_annotations,
					set_predictions,
					set_selected_ann_id,
					set_selected_prediction_id
				)
			)
				return
			if (handle_class_shortcut(key, classes, set_active_class)) return
			handle_undo_redo_shortcut(key, e, undo, redo)
		}
		window.addEventListener('keydown', handle_key_down)
		return () => window.removeEventListener('keydown', handle_key_down)
	}, [
		selected_ann_id,
		selected_prediction_id,
		undo,
		redo,
		set_annotations,
		set_predictions,
		set_selected_ann_id,
		set_selected_prediction_id,
		classes
	])
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
