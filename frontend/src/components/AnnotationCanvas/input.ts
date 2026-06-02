import type { AnnotationTool, MaskLine, Annotation } from './types'
import { handle_bbox_draw_start, handle_bbox_draw_move, handle_bbox_draw_end } from './bbox'
import { handle_polygon_click, finish_polygon_logic } from './polygon'
import { handle_brush_draw_start, handle_brush_draw_move, handle_brush_draw_end } from './brush'

export function handle_mouse_down_logic(
	active_tool: AnnotationTool,
	pos: { x: number; y: number },
	set_selected_ann_id: (id: string | undefined) => void,
	set_selected_prediction_id: (id: string | undefined) => void,
	drawing_polygon: { x: number; y: number }[],
	set_drawing_polygon: (
		fn: (prev: { x: number; y: number }[]) => { x: number; y: number }[]
	) => void,
	finish_polygon: () => void,
	zoom_level: number,
	image: HTMLImageElement | undefined,
	set_is_drawing: (v: boolean) => void,
	set_drawing_start: (p: { x: number; y: number }) => void,
	set_drawing_rect: (r: { x: number; y: number; w: number; h: number }) => void,
	set_drawing_mask_lines: (fn: (prev: MaskLine[]) => MaskLine[]) => void,
	brush_size: number
) {
	if (active_tool === 'select') {
		set_selected_ann_id(undefined)
		set_selected_prediction_id(undefined)
	} else if (active_tool === 'bbox') {
		handle_bbox_draw_start(pos, set_is_drawing, set_drawing_start, set_drawing_rect)
	} else if (active_tool === 'polygon') {
		handle_polygon_click(pos, drawing_polygon, set_drawing_polygon, finish_polygon, zoom_level)
	} else if (active_tool === 'brush' || active_tool === 'eraser') {
		if (image)
			handle_brush_draw_start(
				pos,
				image,
				set_is_drawing,
				set_drawing_mask_lines,
				brush_size,
				zoom_level,
				active_tool
			)
	}
}

export function handle_mouse_move_logic(
	active_tool: AnnotationTool,
	pos: { x: number; y: number },
	is_drawing: boolean,
	drawing_start: { x: number; y: number },
	image: HTMLImageElement | undefined,
	set_drawing_rect: (r: { x: number; y: number; w: number; h: number }) => void,
	drawing_polygon: { x: number; y: number }[],
	set_preview_point: (p: { x: number; y: number } | undefined) => void,
	set_drawing_mask_lines: (fn: (prev: MaskLine[]) => MaskLine[]) => void
) {
	if (active_tool === 'bbox' && is_drawing && image) {
		handle_bbox_draw_move(pos, is_drawing, drawing_start, image, set_drawing_rect)
	} else if (active_tool === 'polygon' && drawing_polygon.length > 0) {
		set_preview_point(pos)
	} else if ((active_tool === 'brush' || active_tool === 'eraser') && image) {
		set_preview_point(pos)
		handle_brush_draw_move(pos, is_drawing, image, set_drawing_mask_lines)
	}
}

export function handle_mouse_up_logic(
	is_drawing: boolean,
	active_tool: AnnotationTool,
	drawing_rect: { x: number; y: number; w: number; h: number } | undefined,
	image: HTMLImageElement | undefined,
	active_class: string,
	annotations: Annotation[],
	on_annotations_change: (anns: Annotation[]) => void,
	set_selected_ann_id: (id: string | undefined) => void,
	set_is_drawing: (v: boolean) => void,
	set_drawing_rect: (r: { x: number; y: number; w: number; h: number } | undefined) => void,
	drawing_mask_lines: MaskLine[],
	set_drawing_mask_lines: (v: MaskLine[]) => void
) {
	if (is_drawing && active_tool === 'bbox' && image) {
		handle_bbox_draw_end(
			drawing_rect,
			image,
			active_class,
			annotations,
			on_annotations_change,
			set_selected_ann_id,
			set_is_drawing,
			set_drawing_rect
		)
	} else if (is_drawing && (active_tool === 'brush' || active_tool === 'eraser') && image) {
		handle_brush_draw_end(
			drawing_mask_lines,
			active_tool,
			annotations,
			active_class,
			on_annotations_change,
			set_selected_ann_id,
			set_is_drawing,
			set_drawing_mask_lines
		)
	}
}

export { finish_polygon_logic }
