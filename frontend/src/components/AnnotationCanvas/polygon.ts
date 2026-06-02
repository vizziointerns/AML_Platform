import type { Annotation } from './types'

export function handle_polygon_click(
	pos: { x: number; y: number },
	drawing_polygon: { x: number; y: number }[],
	set_drawing_polygon: (
		fn: (prev: { x: number; y: number }[]) => { x: number; y: number }[]
	) => void,
	finish_polygon_fn: () => void,
	zoom_level: number
) {
	if (drawing_polygon.length > 2) {
		const first_pt = drawing_polygon[0]
		if (!first_pt) return
		const dist = Math.hypot(pos.x - first_pt.x, pos.y - first_pt.y)
		if (dist < 10 / zoom_level) {
			finish_polygon_fn()
			return
		}
	}
	set_drawing_polygon((prev) => [...prev, pos])
}

export function finish_polygon_logic(
	drawing_polygon: { x: number; y: number }[],
	set_drawing_polygon: (v: { x: number; y: number }[]) => void,
	set_preview_point: (v: { x: number; y: number } | undefined) => void,
	image: HTMLImageElement | undefined,
	active_class: string,
	annotations: Annotation[],
	on_annotations_change: (anns: Annotation[]) => void,
	set_selected_ann_id: (id: string | undefined) => void
) {
	if (drawing_polygon.length < 3) {
		set_drawing_polygon([])
		set_preview_point(undefined)
		return
	}
	if (!image) return

	let min_x = 99999,
		min_y = 99999,
		max_x = -99999,
		max_y = -99999
	const pts = drawing_polygon.map((pt) => {
		const pct_x = Math.max(0, Math.min((pt.x / image.width) * 100, 100))
		const pct_y = Math.max(0, Math.min((pt.y / image.height) * 100, 100))
		if (pct_x < min_x) min_x = pct_x
		if (pct_y < min_y) min_y = pct_y
		if (pct_x > max_x) max_x = pct_x
		if (pct_y > max_y) max_y = pct_y
		return { x: pct_x, y: pct_y }
	})

	const new_ann = {
		id: Math.random().toString(36).substr(2, 9),
		type: 'polygon' as const,
		classId: active_class,
		x: min_x,
		y: min_y,
		w: max_x - min_x,
		h: max_y - min_y,
		points: pts
	}
	on_annotations_change([...annotations, new_ann])
	set_selected_ann_id(new_ann.id)
	set_preview_point(undefined)
	set_drawing_polygon([])
}
