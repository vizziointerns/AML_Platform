import { useState } from 'react'
import Konva from 'konva'
import { Group, Line, Circle, Text, Rect } from 'react-konva'

interface Point {
	x: number
	y: number
}

interface Annotation {
	id: string
	type: 'bbox' | 'polygon' | 'mask'
	classId: string
	points?: Point[]
	x: number
	y: number
	w: number
	h: number
	lockedBy?: string | null
	confidence?: number
}

interface Props {
	ann: Annotation
	is_selected: boolean
	is_hovered: boolean
	color: string
	label: string
	zoom_level: number
	image_width: number
	image_height: number
	active_tool: string
	is_prediction?: boolean
	confidence?: number
	locked_by_name?: string
	locked_by_color?: string
	on_select: () => void
	on_hover: (is_hovered: boolean) => void
	on_change: (new_ann: Annotation) => void
}

function compute_polygon_fill(is_selected: boolean, is_hovered: boolean, is_locked: boolean, color: string, locked_by_color: string | undefined): string {
	if (is_selected) return `${color}33`
	if (is_hovered) return `${color}44`
	if (is_locked) return `${locked_by_color}22`
	return `${color}11`
}

function compute_label_text(is_prediction: boolean, label: string, confidence: number | undefined, is_locked: boolean): string {
	if (is_prediction) {
		const pct = confidence ? ` ${Math.round(confidence * 100)}%` : ''
		return `[AI] ${label}${pct}`
	}
	if (is_locked) return `🔒 ${label}`
	return label
}

function compute_label_bg_fill(is_prediction: boolean, is_locked: boolean, locked_by_color: string | undefined, color: string): string {
	if (is_prediction) return '#6b7280'
	if (is_locked) return locked_by_color ?? color
	return color
}

function render_polygon_vertices(
	absolute_points: Point[],
	hovered_point: number | undefined,
	zoom_level: number,
	color: string,
	set_hovered_point: (i: number | undefined) => void,
	ann: Annotation,
	image_width: number,
	image_height: number,
	is_locked: boolean,
	on_change: (new_ann: Annotation) => void
) {
	return absolute_points.map((pt: Point, i: number) => {
		const handle_vertex_drag_end = (e: Konva.KonvaEventObject<DragEvent>) => {
			handle_drag_end(i, e, ann, image_width, image_height, is_locked, on_change)
		}
		return (
			<Circle
				key={`pt-${i}`}
				x={pt.x}
				y={pt.y}
				radius={hovered_point === i ? 6 / zoom_level : 4 / zoom_level}
				fill="white"
				stroke={color}
				strokeWidth={1.5 / zoom_level}
				draggable
				onDragStart={(e) => { e.cancelBubble = true }}
				onDragEnd={(e) => { e.cancelBubble = true; handle_vertex_drag_end(e) }}
				onMouseEnter={() => set_hovered_point(i)}
				onMouseLeave={() => set_hovered_point(undefined)}
			/>
		)
	})
}

function render_polygon_line(flat_points: number[], is_selected: boolean, is_hovered: boolean, is_locked: boolean, color: string, locked_by_color: string | undefined, zoom_level: number, is_prediction: boolean) {
	const fill = compute_polygon_fill(is_selected, is_hovered, is_locked, color, locked_by_color)
	const stroke = is_locked ? (locked_by_color || color) : color
	const stroke_width = is_selected ? 3 / zoom_level : 2 / zoom_level
	const dash = is_prediction ? [10 / zoom_level, 10 / zoom_level] : is_locked ? [5 / zoom_level, 5 / zoom_level] : undefined
	return (
		<Line points={flat_points} fill={fill} stroke={stroke} strokeWidth={stroke_width} dash={dash} closed={true} tension={0} hitStrokeWidth={10 / zoom_level} />
	)
}

function render_label_group(min_x: number, min_y: number, zoom_level: number, is_prediction: boolean, is_locked: boolean, locked_by_color: string | undefined, locked_by_name: string | undefined, color: string, label: string, confidence: number | undefined) {
	const bg_fill = compute_label_bg_fill(is_prediction, is_locked, locked_by_color, color)
	const label_text = compute_label_text(is_prediction, label, confidence, is_locked)
	const width_val = ((label.length + (confidence ? 5 : 0) + (is_locked ? 3 : 0)) * 6.5 + (is_prediction ? 14 : 10)) / zoom_level
	const height_val = 16 / zoom_level

	return (
		<Group x={min_x} y={min_y - height_val}>
			<Rect fill={bg_fill} width={width_val} height={height_val} />
			<Text text={label_text} fill="white" fontSize={10 / zoom_level} fontStyle="bold" padding={3 / zoom_level} />
			{is_locked && locked_by_name && (
				<Text y={-14 / zoom_level} text={`Locked by ${locked_by_name}`} fill={locked_by_color || 'white'} fontSize={9 / zoom_level} fontStyle="bold" padding={2 / zoom_level} />
			)}
		</Group>
	)
}

function render_polygon_midpoints(
	midpoints: { x: number; y: number; index: number }[],
	hovered_midpoint: number | undefined,
	zoom_level: number,
	color: string,
	set_hovered_midpoint: (i: number | undefined) => void,
	ann: Annotation,
	image_width: number,
	image_height: number,
	on_change: (new_ann: Annotation) => void
) {
	return midpoints.map((pt, i: number) => (
		<Circle
			key={`mid-${i}`}
			x={pt.x}
			y={pt.y}
			radius={hovered_midpoint === i ? 5 / zoom_level : 4 / zoom_level}
			fill="white"
			opacity={hovered_midpoint === i ? 1 : 0.6}
			stroke={color}
			strokeWidth={1.5 / zoom_level}
			onClick={(e) => {
				e.cancelBubble = true
				const new_pts = [...(ann.points ?? [])]
				new_pts.splice(pt.index + 1, 0, {
					x: (pt.x / image_width) * 100,
					y: (pt.y / image_height) * 100
				})
				on_change({ ...ann, points: new_pts })
			}}
			onMouseEnter={() => set_hovered_midpoint(i)}
			onMouseLeave={() => set_hovered_midpoint(undefined)}
		/>
	))
}

function compute_bounding_box(points: Point[]): { min_x: number; min_y: number; max_x: number; max_y: number } {
	let min_x_p = 100, min_y_p = 100, max_x_p = 0, max_y_p = 0
	points.forEach((pt) => {
		if (pt.x < min_x_p) min_x_p = pt.x
		if (pt.y < min_y_p) min_y_p = pt.y
		if (pt.x > max_x_p) max_x_p = pt.x
		if (pt.y > max_y_p) max_y_p = pt.y
	})
	return { min_x: min_x_p, min_y: min_y_p, max_x: max_x_p, max_y: max_y_p }
}

function handle_drag_end(index: number, e: Konva.KonvaEventObject<DragEvent>, ann: Annotation, image_width: number, image_height: number, is_locked: boolean, on_change: (new_ann: Annotation) => void) {
	if (is_locked) return
	const new_x_pct = (e.target.x() / image_width) * 100
	const new_y_pct = (e.target.y() / image_height) * 100

	const new_points = [...(ann.points ?? [])]
	new_points[index] = {
		x: Math.max(0, Math.min(new_x_pct, 100)),
		y: Math.max(0, Math.min(new_y_pct, 100))
	}

	const bbox = compute_bounding_box(new_points)
	on_change({ ...ann, points: new_points, x: bbox.min_x, y: bbox.min_y, w: bbox.max_x - bbox.min_x, h: bbox.max_y - bbox.min_y })
}

function handle_group_drag_end(e: Konva.KonvaEventObject<DragEvent>, ann: Annotation, image_width: number, image_height: number, is_selected: boolean, is_locked: boolean, on_change: (new_ann: Annotation) => void) {
	if (!is_selected || is_locked) return
	const node = e.target
	const dx_pct = (node.x() / image_width) * 100
	const dy_pct = (node.y() / image_height) * 100

	node.x(0)
	node.y(0)

	const new_points = (ann.points ?? []).map((pt: Point) => ({
		x: Math.max(0, Math.min(pt.x + dx_pct, 100)),
		y: Math.max(0, Math.min(pt.y + dy_pct, 100))
	}))

	const bbox = compute_bounding_box(new_points)
	on_change({ ...ann, points: new_points, x: bbox.min_x, y: bbox.min_y, w: bbox.max_x - bbox.min_x, h: bbox.max_y - bbox.min_y })
}

export default function annotation_polygon({
	ann,
	is_selected,
	is_hovered,
	color,
	label,
	zoom_level,
	image_width,
	image_height,
	active_tool,
	is_prediction = false,
	confidence,
	locked_by_name,
	locked_by_color,
	on_select,
	on_hover,
	on_change
}: Props) {
	const [hovered_point, set_hovered_point] = useState<number | undefined>(undefined)
	const [hovered_midpoint, set_hovered_midpoint] = useState<number | undefined>(undefined)
	const is_locked = !!locked_by_name

	if (!ann.points || ann.points.length === 0) return undefined

	const absolute_points = ann.points.map((pt: Point) => ({
		x: (pt.x / 100) * image_width,
		y: (pt.y / 100) * image_height
	}))

	const flat_points = absolute_points.flatMap((pt: Point) => [pt.x, pt.y])

	const min_x = Math.min(...absolute_points.map((p: Point) => p.x))
	const min_y = Math.min(...absolute_points.map((p: Point) => p.y))

	const midpoints: { x: number; y: number; index: number }[] = []
	if (is_selected && active_tool === 'select' && !is_locked) {
		for (let i = 0; i < absolute_points.length; i++) {
			const next = absolute_points[(i + 1) % absolute_points.length]
			midpoints.push({
				x: (absolute_points[i]!.x + next!.x) / 2,
				y: (absolute_points[i]!.y + next!.y) / 2,
				index: i
			})
		}
	}

	return (
		<Group
			draggable={active_tool === 'select' && is_selected && !is_locked}
			onDragEnd={(e) => handle_group_drag_end(e, ann, image_width, image_height, is_selected, is_locked, on_change)}
			onClick={(e) => {
				if (active_tool === 'select') {
					e.cancelBubble = true
					on_select()
				}
			}}
			onMouseEnter={() => on_hover(true)}
			onMouseLeave={() => on_hover(false)}
		>
			{render_polygon_line(flat_points, is_selected, is_hovered, is_locked, color, locked_by_color, zoom_level, is_prediction)}

			{render_label_group(min_x, min_y, zoom_level, is_prediction, is_locked, locked_by_color, locked_by_name, color, label, confidence)}

			{is_selected && active_tool === 'select' && !is_locked && render_polygon_vertices(absolute_points, hovered_point, zoom_level, color, set_hovered_point, ann, image_width, image_height, is_locked, on_change)}

			{is_selected && active_tool === 'select' && render_polygon_midpoints(midpoints, hovered_midpoint, zoom_level, color, set_hovered_midpoint, ann, image_width, image_height, on_change)}
		</Group>
	)
}
