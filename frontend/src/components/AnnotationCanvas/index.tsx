import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Stage, Layer, Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'
import type Konva from 'konva'
import type { AnnotationCanvasProps, MaskLine, TiledBackgroundConfig } from './types'
import { cog_layer_component as CogLayerComponent } from './cog_layer'
import { cog_tile_layer_component as CogTileLayerComponent } from './cog_tile_layer'
import { finish_polygon_logic } from './polygon'
import { handle_mouse_down_logic, handle_mouse_move_logic, handle_mouse_up_logic } from './input'
import { render_mask_layer } from './brush'
import {
	render_annotation_elements,
	render_drawing_preview,
	render_collaboration_layer,
	update_cursor_style
} from './render'

function use_display_image(
	tiled_background: TiledBackgroundConfig | undefined,
	loaded_render: HTMLImageElement | undefined
): HTMLImageElement | undefined {
	const mock_ref = useRef<HTMLImageElement | undefined>(undefined)
	if (tiled_background) {
		const cur = mock_ref.current
		if (
			!cur ||
			cur.width !== tiled_background.image_width ||
			cur.height !== tiled_background.image_height
		) {
			const mock = new window.Image()
			mock.width = tiled_background.image_width
			mock.height = tiled_background.image_height
			Object.defineProperty(mock, 'naturalWidth', { value: tiled_background.image_width })
			Object.defineProperty(mock, 'naturalHeight', { value: tiled_background.image_height })
			mock_ref.current = mock
		}
	}
	return tiled_background ? (mock_ref.current ?? loaded_render) : loaded_render
}

export default function annotation_canvas({
	imageUrl: image_url,
	tiledBackground: tiled_background,
	cogLayers: cog_layers = [],
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
	const [loaded_render] = useImage(image_url, 'anonymous')
	const image = use_display_image(tiled_background, loaded_render)

	const background_cog_config = useMemo(() => {
		if (!tiled_background) return undefined
		return {
			id: 'background',
			url: tiled_background.url,
			name: 'Background',
			visible: true,
			opacity: 100,
			band: tiled_background.band,
			palette: tiled_background.palette,
			min: tiled_background.min,
			max: tiled_background.max,
			composite_mode: 'single' as const
		}
	}, [tiled_background])

	const stage_ref = useRef<Konva.Stage>(undefined!)
	const container_ref = useRef<HTMLDivElement>(undefined!)

	const [stage_size, set_stage_size] = useState({ width: 800, height: 600 })

	const base_zoom = useMemo(() => {
		if (!tiled_background || stage_size.width === 0) return 1
		return Math.min(
			stage_size.width / tiled_background.image_width,
			stage_size.height / tiled_background.image_height
		)
	}, [tiled_background, stage_size])

	const pixel_scale = zoom_level * base_zoom
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
		if (!image && !tiled_background) return
		if (stage_size.width === 0 || stage_size.height === 0) return
		const img_w = tiled_background ? tiled_background.image_width : image!.width
		const img_h = tiled_background ? tiled_background.image_height : image!.height
		const scale = Math.min((stage_size.width * 0.9) / img_w, (stage_size.height * 0.9) / img_h)
		const new_zoom = scale / base_zoom
		if (Math.abs(new_zoom - zoom_level) > 0.01) {
			on_zoom_change(new_zoom)
		}
	}, [image, stage_size, tiled_background, base_zoom])

	const get_pointer_pos_in_image = useCallback(
		(stage: Konva.Stage | null) => {
			if (!stage) return { x: 0, y: 0 }
			const pointer_position = stage.getPointerPosition()
			if (!pointer_position) return { x: 0, y: 0 }
			return {
				x: (pointer_position.x - offset.x) / pixel_scale,
				y: (pointer_position.y - offset.y) / pixel_scale
			}
		},
		[offset, pixel_scale]
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
				const current_pixel = pixel_scale
				const min_zoom = tiled_background ? 0.5 : 0.1
				const max_zoom = tiled_background ? 20 : 10
				const min_pixel = min_zoom * base_zoom
				const max_pixel = max_zoom * base_zoom
				const mouse_point_to = {
					x: (pointer.x - offset.x) / current_pixel,
					y: (pointer.y - offset.y) / current_pixel
				}
				const new_pixel =
					e.evt.deltaY > 0
						? Math.max(current_pixel / scale_by, min_pixel)
						: Math.min(current_pixel * scale_by, max_pixel)
				on_zoom_change(new_pixel / base_zoom)
				on_offset_change({
					x: pointer.x - mouse_point_to.x * new_pixel,
					y: pointer.y - mouse_point_to.y * new_pixel
				})
			} else {
				on_offset_change({
					x: offset.x - e.evt.deltaX,
					y: offset.y - e.evt.deltaY
				})
			}
		},
		[offset, pixel_scale, tiled_background, base_zoom, on_zoom_change, on_offset_change]
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
				pixel_scale,
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
			pixel_scale,
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
				scaleX={pixel_scale}
				scaleY={pixel_scale}
			>
				<Layer imageSmoothingEnabled={true} listening={false}>
					{loaded_render && (
						<KonvaImage
							image={loaded_render}
							name="background-image"
							width={tiled_background ? tiled_background.image_width : loaded_render.width}
							height={tiled_background ? tiled_background.image_height : loaded_render.height}
							x={0}
							y={0}
						/>
					)}
				</Layer>
				{background_cog_config && (
					<Layer listening={false}>
						<CogTileLayerComponent
							config={background_cog_config}
							viewport={{
								offset,
								zoom_level: pixel_scale,
								stage_width: stage_size.width,
								stage_height: stage_size.height
							}}
							image_width={tiled_background!.image_width}
							image_height={tiled_background!.image_height}
							skip={zoom_level < 0.3}
						/>
					</Layer>
				)}

				{cog_layers
					.filter((l) => l.visible)
					.map((layer_config) => (
						<Layer key={layer_config.id} listening={false}>
							<CogLayerComponent config={layer_config} />
						</Layer>
					))}

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
							pixel_scale,
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
							pixel_scale,
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
						pixel_scale,
						get_class_color,
						get_class_name,
						brush_size,
						active_class
					)}
				</Layer>
				{render_collaboration_layer(image, collaborators, pixel_scale)}
			</Stage>
		</div>
	)
}
