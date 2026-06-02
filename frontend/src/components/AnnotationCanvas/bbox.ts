export function handle_bbox_draw_start(
	pos: { x: number; y: number },
	set_is_drawing: (v: boolean) => void,
	set_drawing_start: (p: { x: number; y: number }) => void,
	set_drawing_rect: (r: { x: number; y: number; w: number; h: number }) => void
) {
	set_is_drawing(true)
	set_drawing_start(pos)
	set_drawing_rect({ x: pos.x, y: pos.y, w: 0, h: 0 })
}

export function handle_bbox_draw_move(
	pos: { x: number; y: number },
	is_drawing: boolean,
	drawing_start: { x: number; y: number },
	image: HTMLImageElement,
	set_drawing_rect: (r: { x: number; y: number; w: number; h: number }) => void
) {
	if (!is_drawing || !image) return
	const start = drawing_start
	const raw_x = Math.min(pos.x, start.x)
	const raw_y = Math.min(pos.y, start.y)
	const raw_max_x = Math.max(pos.x, start.x)
	const raw_max_y = Math.max(pos.y, start.y)
	const x = Math.max(0, raw_x)
	const y = Math.max(0, raw_y)
	const max_x = Math.min(image.width, raw_max_x)
	const max_y = Math.min(image.height, raw_max_y)
	const w = max_x - x
	const h = max_y - y
	set_drawing_rect({ x, y, w, h })
}

import type { Annotation } from './types'

export function handle_bbox_draw_end(
	drawing_rect: { x: number; y: number; w: number; h: number } | undefined,
	image: HTMLImageElement,
	active_class: string,
	annotations: Annotation[],
	on_annotations_change: (anns: Annotation[]) => void,
	set_selected_ann_id: (id: string | undefined) => void,
	set_is_drawing: (v: boolean) => void,
	set_drawing_rect: (r: { x: number; y: number; w: number; h: number } | undefined) => void
) {
	set_is_drawing(false)
	if (!drawing_rect || drawing_rect.w <= 5 || drawing_rect.h <= 5) {
		set_drawing_rect(undefined)
		return
	}
	const x_pct = (drawing_rect.x / image.width) * 100
	const y_pct = (drawing_rect.y / image.height) * 100
	const w_pct = (drawing_rect.w / image.width) * 100
	const h_pct = (drawing_rect.h / image.height) * 100
	const new_ann = {
		id: Math.random().toString(36).substr(2, 9),
		type: 'bbox' as const,
		classId: active_class,
		x: x_pct,
		y: y_pct,
		w: w_pct,
		h: h_pct
	}
	on_annotations_change([...annotations, new_ann])
	set_selected_ann_id(new_ann.id)
	set_drawing_rect(undefined)
}
