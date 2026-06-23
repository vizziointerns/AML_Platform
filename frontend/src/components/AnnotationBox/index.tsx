import { useRef, useEffect } from 'react'
import { Group, Rect, Text, Transformer } from 'react-konva'
import Konva from 'konva'

interface AnnotationShape {
	id: string
	type: 'bbox' | 'polygon' | 'mask'
	classId: string
	x: number
	y: number
	w: number
	h: number
}

interface Props {
	ann: AnnotationShape
	isSelected: boolean
	isHovered: boolean
	color: string
	label: string
	zoomLevel: number
	imageWidth: number
	imageHeight: number
	activeTool: string
	isPrediction?: boolean
	confidence?: number
	lockedByName?: string
	lockedByColor?: string
	onSelect: () => void
	onHover: (hovered: boolean) => void
	onChange: (newAnn: AnnotationShape) => void
}

function clamp(val: number, min: number, max: number) {
	return Math.min(max, Math.max(min, val))
}

function handle_box_drag_end(
	node: Konva.Group | null,
	ann: AnnotationShape,
	imageWidth: number,
	imageHeight: number,
	onChange: (a: AnnotationShape) => void
) {
	if (!node) return
	const new_x = clamp((node.x() / imageWidth) * 100, 0, 100 - ann.w)
	const new_y = clamp((node.y() / imageHeight) * 100, 0, 100 - ann.h)
	node.x((new_x / 100) * imageWidth)
	node.y((new_y / 100) * imageHeight)
	onChange({ ...ann, x: new_x, y: new_y })
}

function handle_box_transform(
	node: Konva.Group | null,
	ann: AnnotationShape,
	imageWidth: number,
	imageHeight: number,
	width: number,
	height: number,
	onChange: (a: AnnotationShape) => void
) {
	if (!node) return
	const scale_x = node.scaleX()
	const scale_y = node.scaleY()
	node.scaleX(1)
	node.scaleY(1)

	let w = width * scale_x
	let h = height * scale_y
	let new_x = node.x()
	let new_y = node.y()

	if (new_x < 0) {
		w += new_x
		new_x = 0
	}
	if (new_y < 0) {
		h += new_y
		new_y = 0
	}
	if (new_x + w > imageWidth) w = imageWidth - new_x
	if (new_y + h > imageHeight) h = imageHeight - new_y

	onChange({
		...ann,
		x: (new_x / imageWidth) * 100,
		y: (new_y / imageHeight) * 100,
		w: (w / imageWidth) * 100,
		h: (h / imageHeight) * 100
	})
}

function render_label_overlay(
	isPrediction: boolean,
	label: string,
	confidence: number | undefined,
	is_locked: boolean,
	lockedByName: string | undefined,
	lockedByColor: string | undefined,
	zoomLevel: number,
	color: string
) {
	const is_show_locked_info = is_locked && lockedByName
	const label_text = isPrediction
		? `[AI] ${label}${confidence ? ' ' + Math.round(confidence * 100) + '%' : ''}`
		: is_locked
			? `🔒 ${label}`
			: label
	const label_bg_width =
		((label.length + (confidence ? 5 : 0) + (is_locked ? 3 : 0)) * 6.5 + (isPrediction ? 14 : 10)) /
		zoomLevel
	const label_bg_color = isPrediction ? '#6b7280' : is_locked ? lockedByColor || color : color

	return (
		<Group y={-16 / zoomLevel}>
			<Rect fill={label_bg_color} width={label_bg_width} height={16 / zoomLevel} />
			<Text
				text={label_text}
				fill="white"
				fontSize={10 / zoomLevel}
				fontStyle="bold"
				padding={3 / zoomLevel}
			/>
			{is_show_locked_info && (
				<Text
					y={-14 / zoomLevel}
					text={`Locked by ${lockedByName}`}
					fill={lockedByColor || 'white'}
					fontSize={9 / zoomLevel}
					fontStyle="bold"
					padding={2 / zoomLevel}
				/>
			)}
		</Group>
	)
}

function render_transformer_component(
	show: boolean,
	trRef: React.RefObject<Konva.Transformer | undefined>,
	color: string,
	zoomLevel: number
) {
	if (!show) return undefined
	return (
		<Transformer
			ref={trRef as React.Ref<Konva.Transformer>}
			boundBoxFunc={(oldBox, newBox) => {
				if (newBox.width < 5 || newBox.height < 5) return oldBox
				return newBox
			}}
			rotateEnabled={false}
			ignoreStroke
			anchorSize={10 / zoomLevel}
			borderStroke={color}
			anchorStroke={color}
			anchorFill="white"
			borderStrokeWidth={2 / zoomLevel}
			anchorStrokeWidth={2 / zoomLevel}
			enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
			shouldOverdrawWholeArea
		/>
	)
}

export default function annotation_box({
	ann,
	isSelected,
	isHovered,
	color,
	label,
	zoomLevel,
	imageWidth,
	imageHeight,
	activeTool,
	isPrediction = false,
	confidence,
	lockedByName,
	lockedByColor,
	onSelect,
	onHover,
	onChange
}: Props) {
	const group_ref = useRef<Konva.Group>(undefined!)
	const tr_ref = useRef<Konva.Transformer>(undefined!)

	const is_locked = !!lockedByName

	useEffect(() => {
		if (isSelected && !is_locked && tr_ref.current && group_ref.current) {
			tr_ref.current.nodes([group_ref.current])
			tr_ref.current.getLayer()?.batchDraw()
		}
	}, [isSelected, is_locked])

	const x = (ann.x / 100) * imageWidth
	const y = (ann.y / 100) * imageHeight
	const width = Math.max(1, (ann.w / 100) * imageWidth)
	const height = Math.max(1, (ann.h / 100) * imageHeight)

	const can_drag = activeTool === 'select' && isSelected && !is_locked
	const fill_color = isSelected
		? `${color}33`
		: isHovered
			? `${color}44`
			: is_locked
				? `${lockedByColor}22`
				: `${color}11`
	const stroke_width_val = isSelected ? 3 / zoomLevel : 2 / zoomLevel
	const dash_val = isPrediction
		? [10 / zoomLevel, 10 / zoomLevel]
		: is_locked
			? [5 / zoomLevel, 5 / zoomLevel]
			: undefined

	return (
		<>
			<Group
				ref={group_ref}
				x={x}
				y={y}
				draggable={can_drag}
				dragBoundFunc={(pos) => pos}
				onDragEnd={() =>
					handle_box_drag_end(group_ref.current, ann, imageWidth, imageHeight, onChange)
				}
				onTransform={() =>
					handle_box_transform(
						group_ref.current,
						ann,
						imageWidth,
						imageHeight,
						width,
						height,
						onChange
					)
				}
				onClick={(e) => {
					if (activeTool === 'select') {
						e.cancelBubble = true
						onSelect()
					}
				}}
				onMouseEnter={() => onHover(true)}
				onMouseLeave={() => onHover(false)}
			>
				<Rect
					width={width}
					height={height}
					fill={fill_color}
					stroke={is_locked ? lockedByColor : color}
					strokeWidth={stroke_width_val}
					dash={dash_val}
				/>
				{render_label_overlay(
					isPrediction,
					label,
					confidence,
					is_locked,
					lockedByName,
					lockedByColor,
					zoomLevel,
					color
				)}
			</Group>
			{render_transformer_component(can_drag, tr_ref, color, zoomLevel)}
		</>
	)
}
