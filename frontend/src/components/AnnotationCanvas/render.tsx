import { Group, Rect, Text, Circle, Line, Path, Layer } from 'react-konva'
import AnnotationBox from '../AnnotationBox'
import AnnotationPolygon from '../AnnotationPolygon'
import type { Annotation, Collaborator, AnnotationTool } from './types'

export function render_annotation_elements(
	items: Annotation[],
	image: HTMLImageElement,
	is_selected_id: string | undefined,
	hovered_id: string | undefined,
	zoom_level: number,
	active_tool: AnnotationTool,
	get_class_color: (id: string) => string,
	get_class_name: (id: string) => string,
	collaborators: Collaborator[],
	on_select: (id: string) => void,
	on_hover: (id: string | undefined) => void,
	on_change: (anns: Annotation[]) => void,
	is_prediction?: boolean
) {
	return items.map((ann: Annotation) => {
		const locked_user = collaborators.find((c: Collaborator) => c.id === ann.lockedBy)
		if (ann.type === 'polygon') {
			return (
				<AnnotationPolygon
					key={ann.id}
					ann={ann}
					is_selected={is_selected_id === ann.id}
					is_hovered={hovered_id === ann.id}
					color={get_class_color(ann.classId)}
					label={get_class_name(ann.classId)}
					zoom_level={zoom_level}
					image_width={image.width}
					image_height={image.height}
					active_tool={active_tool}
					locked_by_name={locked_user?.name}
					locked_by_color={locked_user?.color}
					is_prediction={is_prediction}
					confidence={ann.confidence}
					on_select={() => on_select(ann.id)}
					on_hover={(hovered: boolean) => on_hover(hovered ? ann.id : undefined)}
					on_change={(new_ann) => {
						const new_items = items.map((a: Annotation) => (a.id === ann.id ? new_ann : a))
						on_change(new_items)
					}}
				/>
			)
		}
		return (
			<AnnotationBox
				key={ann.id}
				ann={ann}
				isSelected={is_selected_id === ann.id}
				isHovered={hovered_id === ann.id}
				color={get_class_color(ann.classId)}
				label={get_class_name(ann.classId)}
				zoomLevel={zoom_level}
				imageWidth={image.width}
				imageHeight={image.height}
				activeTool={active_tool}
				lockedByName={locked_user?.name}
				lockedByColor={locked_user?.color}
				isPrediction={is_prediction}
				confidence={ann.confidence}
				onSelect={() => on_select(ann.id)}
				onHover={(hovered: boolean) => on_hover(hovered ? ann.id : undefined)}
				onChange={(new_ann) => {
					const new_items = items.map((a: Annotation) => (a.id === ann.id ? new_ann : a))
					on_change(new_items)
				}}
			/>
		)
	})
}

export function render_drawing_preview(
	is_drawing: boolean,
	drawing_rect: { x: number; y: number; w: number; h: number } | undefined,
	active_tool: AnnotationTool,
	drawing_polygon: { x: number; y: number }[],
	preview_point: { x: number; y: number } | undefined,
	zoom_level: number,
	get_class_color: (id: string) => string,
	get_class_name: (id: string) => string,
	brush_size: number,
	active_class: string
) {
	return (
		<>
			{is_drawing && drawing_rect && (
				<Group x={drawing_rect.x} y={drawing_rect.y}>
					<Rect
						width={drawing_rect.w}
						height={drawing_rect.h}
						fill={`${get_class_color(active_class)}33`}
						stroke={get_class_color(active_class)}
						strokeWidth={2 / zoom_level}
					/>
					<Group y={-16 / zoom_level}>
						<Rect
							fill={get_class_color(active_class)}
							width={(get_class_name(active_class).length * 6 + 10) / zoom_level}
							height={16 / zoom_level}
						/>
						<Text
							text={get_class_name(active_class)}
							fill="white"
							fontSize={10 / zoom_level}
							fontStyle="bold"
							padding={3 / zoom_level}
						/>
					</Group>
				</Group>
			)}
			{active_tool === 'polygon' && drawing_polygon.length > 0 && (
				<Group>
					<Line
						points={drawing_polygon.flatMap((p) => [p.x, p.y])}
						stroke={get_class_color(active_class)}
						strokeWidth={2 / zoom_level}
					/>
					{preview_point && drawing_polygon.length > 0 && (
						<Line
							points={[
								drawing_polygon[drawing_polygon.length - 1]!.x,
								drawing_polygon[drawing_polygon.length - 1]!.y,
								preview_point.x,
								preview_point.y
							]}
							stroke={get_class_color(active_class)}
							strokeWidth={2 / zoom_level}
							dash={[5 / zoom_level, 5 / zoom_level]}
						/>
					)}
					{drawing_polygon.map((p, i) => (
						<Circle
							key={i}
							x={p.x}
							y={p.y}
							radius={i === 0 ? 6 / zoom_level : 4 / zoom_level}
							fill={i === 0 ? 'white' : get_class_color(active_class)}
							stroke={get_class_color(active_class)}
							strokeWidth={1.5 / zoom_level}
						/>
					))}
				</Group>
			)}
			{(active_tool === 'brush' || active_tool === 'eraser') && preview_point && (
				<Circle
					x={preview_point.x}
					y={preview_point.y}
					radius={(brush_size ?? 20) / (2 * zoom_level)}
					fill={active_tool === 'eraser' ? 'rgba(255,255,255,0.5)' : get_class_color(active_class)}
					opacity={0.5}
					stroke={active_tool === 'eraser' ? 'black' : 'white'}
					strokeWidth={1 / zoom_level}
					listening={false}
				/>
			)}
		</>
	)
}

export function render_collaboration_layer(
	image: HTMLImageElement | undefined,
	collaborators: Collaborator[],
	zoom_level: number
) {
	if (!image) return undefined
	return (
		<Layer listening={false}>
			{collaborators.map((c: Collaborator) => {
				if (!c.cursor) return undefined
				const x = (c.cursor.x / 100) * image.width
				const y = (c.cursor.y / 100) * image.height
				return (
					<Group key={c.id} x={x} y={y}>
						<Path
							data="M0 0 L8 24 L12 16 L22 17 Z"
							fill={c.color}
							stroke="white"
							strokeWidth={1 / zoom_level}
							scaleX={1 / zoom_level}
							scaleY={1 / zoom_level}
						/>
						<Group x={12 / zoom_level} y={16 / zoom_level}>
							<Rect
								fill={c.color}
								cornerRadius={4 / zoom_level}
								width={(c.name.length * 7 + 10) / zoom_level}
								height={18 / zoom_level}
							/>
							<Text
								text={c.name}
								fill="white"
								fontSize={11 / zoom_level}
								fontStyle="bold"
								padding={4 / zoom_level}
								align="center"
							/>
						</Group>
					</Group>
				)
			})}
		</Layer>
	)
}

export function update_cursor_style(
	container: HTMLDivElement | null,
	active_tool: AnnotationTool
) {
	if (!container) return
	if (active_tool === 'pan') container.style.cursor = 'grab'
	else if (active_tool === 'bbox') container.style.cursor = 'crosshair'
	else if (active_tool === 'brush' || active_tool === 'eraser')
		container.style.cursor = 'none'
	else container.style.cursor = 'default'
}
