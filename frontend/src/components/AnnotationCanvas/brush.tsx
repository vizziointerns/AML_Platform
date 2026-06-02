import { Layer, Group, Line } from 'react-konva'
import type { Annotation, MaskLine, AnnotationTool } from './types'
import { compute_mask_line_points } from './types'

export function handle_brush_draw_start(
	pos: { x: number; y: number },
	image: HTMLImageElement,
	set_is_drawing: (v: boolean) => void,
	set_drawing_mask_lines: (fn: (prev: MaskLine[]) => MaskLine[]) => void,
	brush_size: number,
	zoom_level: number,
	active_tool: AnnotationTool
) {
	if (!image) return
	set_is_drawing(true)
	const point_arr = [(pos.x / image.width) * 100, (pos.y / image.height) * 100]
	set_drawing_mask_lines(() => [
		{
			points: point_arr,
			brush_size: (brush_size ?? 20) / zoom_level,
			tool: active_tool as 'brush' | 'eraser'
		}
	])
}

export function handle_brush_draw_move(
	pos: { x: number; y: number },
	is_drawing: boolean,
	image: HTMLImageElement,
	set_drawing_mask_lines: (fn: (prev: MaskLine[]) => MaskLine[]) => void
) {
	if (!is_drawing || !image) return
	const pct_x = (pos.x / image.width) * 100
	const pct_y = (pos.y / image.height) * 100
	set_drawing_mask_lines((prev) => {
		if (prev.length === 0) return prev
		const last_line = prev[prev.length - 1]
		if (!last_line) return prev
		const new_points = [...last_line.points, pct_x, pct_y]
		return [...prev.slice(0, -1), { ...last_line, points: new_points }]
	})
}

export function handle_brush_draw_end(
	drawing_mask_lines: MaskLine[],
	active_tool: AnnotationTool,
	annotations: Annotation[],
	active_class: string,
	on_annotations_change: (anns: Annotation[]) => void,
	set_selected_ann_id: (id: string | undefined) => void,
	set_is_drawing: (v: boolean) => void,
	set_drawing_mask_lines: (v: MaskLine[]) => void
) {
	set_is_drawing(false)
	if (drawing_mask_lines.length === 0) {
		set_drawing_mask_lines([])
		return
	}
	const current_class_mask = annotations.find(
		(a: Annotation) => a.type === 'mask' && a.classId === active_class
	)
	if (current_class_mask) {
		const updated = {
			...current_class_mask,
			lines: [...(current_class_mask.lines || []), ...drawing_mask_lines]
		}
		on_annotations_change(annotations.map((a: Annotation) => (a.id === current_class_mask.id ? updated : a)))
	} else if (active_tool === 'brush') {
		const new_mask = {
			id: Math.random().toString(36).substr(2, 9),
			type: 'mask' as const,
			classId: active_class,
			x: 0,
			y: 0,
			w: 100,
			h: 100,
			lines: drawing_mask_lines
		}
		on_annotations_change([...annotations, new_mask])
		set_selected_ann_id(new_mask.id)
	}
	set_drawing_mask_lines([])
}

export function render_mask_lines(
	lines: MaskLine[],
	img_width: number,
	img_height: number,
	stroke_color: string,
	dash_config?: number[]
) {
	return lines.map((line: MaskLine, i: number) => (
		<Line
			key={i}
			points={compute_mask_line_points(line, img_width, img_height)}
			stroke={stroke_color}
			strokeWidth={line.brush_size}
			tension={0.5}
			lineCap="round"
			lineJoin="round"
			globalCompositeOperation={
				line.tool === 'eraser' ? 'destination-out' : 'source-over'
			}
			dash={dash_config}
		/>
	))
}

export function render_mask_layer(
	image: HTMLImageElement | undefined,
	annotations: Annotation[],
	show_predictions: boolean,
	predictions: Annotation[],
	drawing_mask_lines: MaskLine[],
	get_class_color: (id: string) => string,
	active_tool: AnnotationTool,
	active_class: string,
	brush_opacity: number
) {
	if (!image) return undefined
	return (
		<Layer opacity={(brush_opacity ?? 100) / 100} listening={false}>
			{annotations.filter((a: Annotation) => a.type === 'mask')
				.map((ann: Annotation) => (
					<Group key={ann.id}>
						{render_mask_lines(ann.lines ?? [], image.width, image.height, get_class_color(ann.classId))}
					</Group>
				))}
			{show_predictions && predictions.filter((a: Annotation) => a.type === 'mask')
				.map((pred: Annotation) => (
					<Group key={pred.id} opacity={0.5}>
						{render_mask_lines(pred.lines ?? [], image.width, image.height, get_class_color(pred.classId), [5, 10])}
					</Group>
				))}
			{drawing_mask_lines.map((line: MaskLine, i) => (
				<Line
					key={`drawing-${i}`}
					points={compute_mask_line_points(line, image.width, image.height)}
					stroke={active_tool === 'eraser' ? 'rgba(0,0,0,1)' : get_class_color(active_class)}
					strokeWidth={line.brush_size}
					tension={0.5}
					lineCap="round"
					lineJoin="round"
					globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'}
				/>
			))}
		</Layer>
	)
}
