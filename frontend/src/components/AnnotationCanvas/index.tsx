import { useRef, useState, useEffect, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'
import type Konva from 'konva'
import type { AnnotationCanvasProps, MaskLine } from './types'
import { finish_polygon_logic } from './polygon'
import { handle_mouse_down_logic, handle_mouse_move_logic, handle_mouse_up_logic } from './input'
import { render_mask_layer } from './brush'
import {
	render_annotation_elements,
	render_drawing_preview,
	render_collaboration_layer,
	update_cursor_style
} from './render'

export default function annotation_canvas({
	imageUrl: image_url,
	annotations,
	predictions,
	collaborators = [],
	showPredictions: show_predictions,
	activeTool: active_tool,
	activeClass: active_class,
	getClassColor: get_class_color,
	getClassName: get_class_name,
	selectedAnnId: selected_ann_id,
	setSelectedAnnId: set_selected_ann_id,
	selectedPredictionId: selected_prediction_id,
	setSelectedPredictionId: set_selected_prediction_id,
	onAnnotationsChange: on_annotations_change,
	onPredictionsChange: on_predictions_change,
	onZoomChange: on_zoom_change,
	onOffsetChange: on_offset_change,
	zoomLevel: zoom_level,
	offset,
	brushSize: brush_size = 20,
	brushOpacity: brush_opacity = 100,
	onSegmentClick: on_segment_click
}: AnnotationCanvasProps) {
	const [image] = useImage(image_url, 'anonymous')

	const stage_ref = useRef<Konva.Stage>(undefined!)
	const container_ref = useRef<HTMLDivElement>(undefined!)

	const [stage_size, set_stage_size] = useState({ width: 800, height: 600 })
	const [is_drawing, set_is_drawing] = useState(false)
	const [drawing_start, set_drawing_start] = useState({ x: 0, y: 0 })
	const [drawing_rect, set_drawing_rect] = useState<
		| {
				x: number
				y: number
				w: number
				h: number
		  }
		| undefined
	>(undefined)
	const [hovered_ann_id, set_hovered_ann_id] = useState<string | undefined>(undefined)
	const [drawing_polygon, set_drawing_polygon] = useState<{ x: number; y: number }[]>([])
	const [preview_point, set_preview_point] = useState<{ x: number; y: number } | undefined>(
		undefined
	)
	const [drawing_mask_lines, set_drawing_mask_lines] = useState<MaskLine[]>([])

	useEffect(() => {
		if (!container_ref.current) return
		const observer = new ResizeObserver((entries) => {
			if (entries[0]) {
				set_stage_size({
					width: entries[0].contentRect.width,
					height: entries[0].contentRect.height
				})
			}
		})
		observer.observe(container_ref.current)
		return () => observer.disconnect()
	}, [])

	useEffect(() => {
		if (image && stage_size.width > 0 && stage_size.height > 0) {
			const scale = Math.min(
				(stage_size.width * 0.9) / image.width,
				(stage_size.height * 0.9) / image.height
			)
			on_zoom_change(scale)
		}
	}, [image, stage_size])

	const get_pointer_pos_in_image = useCallback(
		(stage: Konva.Stage | null) => {
			if (!stage) return { x: 0, y: 0 }
			const pointer_position = stage.getPointerPosition()
			if (!pointer_position) return { x: 0, y: 0 }
			return {
				x: (pointer_position.x - offset.x) / zoom_level,
				y: (pointer_position.y - offset.y) / zoom_level
			}
		},
		[offset, zoom_level]
	)

	const finish_polygon = useCallback(
		() =>
			finish_polygon_logic(
				drawing_polygon,
				set_drawing_polygon,
				set_preview_point,
				image,
				active_class,
				annotations,
				on_annotations_change,
				set_selected_ann_id
			),
		[drawing_polygon, image, active_class, annotations, on_annotations_change, set_selected_ann_id]
	)

	const handle_wheel = useCallback(
		(e: Konva.KonvaEventObject<WheelEvent>) => {
			e.evt.preventDefault()
			const stage = stage_ref.current
			if (!stage) return
			const pointer = stage.getPointerPosition()
			if (!pointer) return
			if (e.evt.ctrlKey || e.evt.metaKey) {
				const scale_by = 1.1
				const old_scale = zoom_level
				const mouse_point_to = {
					x: (pointer.x - offset.x) / old_scale,
					y: (pointer.y - offset.y) / old_scale
				}
				const new_scale =
					e.evt.deltaY > 0
						? Math.max(old_scale / scale_by, 0.1)
						: Math.min(old_scale * scale_by, 10)
				on_zoom_change(new_scale)
				on_offset_change({
					x: pointer.x - mouse_point_to.x * new_scale,
					y: pointer.y - mouse_point_to.y * new_scale
				})
			} else {
				on_offset_change({
					x: offset.x - e.evt.deltaX,
					y: offset.y - e.evt.deltaY
				})
			}
		},
		[zoom_level, offset, on_zoom_change, on_offset_change]
	)

	const handle_mouse_down = useCallback(
		(e: Konva.KonvaEventObject<MouseEvent>) => {
			const stage = stage_ref.current
			if (!stage) return
			if (e.target.name() !== 'background-image' && e.target !== stage) return
			if (e.evt.button !== 0 && active_tool !== 'select') return
			const pos = get_pointer_pos_in_image(stage)
			handle_mouse_down_logic(
				active_tool,
				pos,
				set_selected_ann_id,
				set_selected_prediction_id,
				drawing_polygon,
				set_drawing_polygon,
				finish_polygon,
				zoom_level,
				image,
				set_is_drawing,
				set_drawing_start,
				set_drawing_rect,
				set_drawing_mask_lines,
				brush_size,
				on_segment_click
			)
		},
		[
			active_tool,
			get_pointer_pos_in_image,
			set_selected_ann_id,
			drawing_polygon,
			zoom_level,
			image,
			brush_size,
			on_segment_click
		]
	)

	const handle_mouse_move = useCallback(() => {
		const pos = get_pointer_pos_in_image(stage_ref.current)
		handle_mouse_move_logic(
			active_tool,
			pos,
			is_drawing,
			drawing_start,
			image,
			set_drawing_rect,
			drawing_polygon,
			set_preview_point,
			set_drawing_mask_lines
		)
	}, [
		active_tool,
		is_drawing,
		drawing_start,
		get_pointer_pos_in_image,
		image,
		drawing_polygon.length
	])

	const handle_mouse_up = useCallback(
		() =>
			handle_mouse_up_logic(
				is_drawing,
				active_tool,
				drawing_rect,
				image,
				active_class,
				annotations,
				on_annotations_change,
				set_selected_ann_id,
				set_is_drawing,
				set_drawing_rect,
				drawing_mask_lines,
				set_drawing_mask_lines
			),
		[
			is_drawing,
			active_tool,
			drawing_rect,
			image,
			active_class,
			annotations,
			on_annotations_change,
			set_selected_ann_id,
			drawing_mask_lines
		]
	)

	const handle_dbl_click = useCallback(() => {
		if (active_tool === 'polygon' && drawing_polygon.length >= 3) {
			finish_polygon()
		}
	}, [active_tool, drawing_polygon.length, finish_polygon])

	const handle_key_down = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'Escape' && drawing_polygon.length > 0) {
				set_drawing_polygon([])
				set_preview_point(undefined)
			}
		},
		[drawing_polygon]
	)

	useEffect(() => {
		window.addEventListener('keydown', handle_key_down)
		return () => window.removeEventListener('keydown', handle_key_down)
	}, [handle_key_down])

	useEffect(() => {
		update_cursor_style(container_ref.current, active_tool)
	}, [active_tool])

	return (
		<div
			ref={container_ref}
			className="w-full h-full bg-zinc-200/50 dark:bg-[#18181b] overflow-hidden"
			tabIndex={0}
		>
			<Stage
				ref={stage_ref}
				width={stage_size.width}
				height={stage_size.height}
				onWheel={handle_wheel}
				onMouseDown={handle_mouse_down}
				onMouseMove={handle_mouse_move}
				onMouseUp={handle_mouse_up}
				onMouseLeave={handle_mouse_up}
				onDblClick={handle_dbl_click}
				draggable={active_tool === 'pan'}
				onDragStart={() => {
					if (active_tool === 'pan' && container_ref.current)
						container_ref.current.style.cursor = 'grabbing'
				}}
				onDragEnd={(e) => {
					if (active_tool === 'pan') {
						if (container_ref.current) container_ref.current.style.cursor = 'grab'
						on_offset_change({ x: e.target.x(), y: e.target.y() })
					}
				}}
				x={offset.x}
				y={offset.y}
				scaleX={zoom_level}
				scaleY={zoom_level}
			>
				<Layer imageSmoothingEnabled={true} listening={false}>
					{image && (
						<KonvaImage
							image={image}
							name="background-image"
							width={image.width}
							height={image.height}
							x={0}
							y={0}
						/>
					)}
				</Layer>

				{render_mask_layer(
					image,
					annotations,
					show_predictions,
					predictions,
					drawing_mask_lines,
					get_class_color,
					active_tool,
					active_class,
					brush_opacity
				)}
				<Layer>
					{image &&
						render_annotation_elements(
							annotations,
							image,
							selected_ann_id,
							hovered_ann_id,
							zoom_level,
							active_tool,
							get_class_color,
							get_class_name,
							collaborators,
							set_selected_ann_id,
							set_hovered_ann_id,
							on_annotations_change
						)}
					{image &&
						show_predictions &&
						render_annotation_elements(
							predictions,
							image,
							selected_prediction_id,
							hovered_ann_id,
							zoom_level,
							active_tool,
							get_class_color,
							get_class_name,
							collaborators,
							set_selected_prediction_id,
							set_hovered_ann_id,
							on_predictions_change,
							true
						)}
					{render_drawing_preview(
						is_drawing,
						drawing_rect,
						active_tool,
						drawing_polygon,
						preview_point,
						zoom_level,
						get_class_color,
						get_class_name,
						brush_size,
						active_class
					)}
				</Layer>
				{render_collaboration_layer(image, collaborators, zoom_level)}
			</Stage>
		</div>
	)
}
