export type AnnotationTool = 'select' | 'pan' | 'bbox' | 'polygon' | 'brush' | 'eraser'

export interface MaskLine {
	points: number[]
	brush_size: number
	tool: 'brush' | 'eraser'
}

export function compute_mask_line_points(
	line: MaskLine,
	img_width: number,
	img_height: number
): number[] {
	return line.points.map((p: number, idx: number) =>
		idx % 2 === 0 ? (p / 100) * img_width : (p / 100) * img_height
	)
}

export interface Annotation {
	id: string
	type: 'bbox' | 'polygon' | 'mask'
	classId: string
	x: number
	y: number
	w: number
	h: number
	points?: { x: number; y: number }[]
	lines?: MaskLine[]
	lockedBy?: string | null
	confidence?: number
}

export interface Collaborator {
	id: string
	name: string
	color: string
	cursor?: { x: number; y: number }
	activeAnnotationId?: string | null
}

export interface AnnotationCanvasProps {
	imageUrl: string
	annotations: Annotation[]
	predictions: Annotation[]
	collaborators?: Collaborator[]
	showPredictions: boolean
	activeTool: AnnotationTool
	activeClass: string
	getClassColor: (id: string) => string
	getClassName: (id: string) => string
	selectedAnnId: string | undefined
	setSelectedAnnId: (id: string | undefined) => void
	selectedPredictionId: string | undefined
	setSelectedPredictionId: (id: string | undefined) => void
	onAnnotationsChange: (ann: Annotation[]) => void
	onPredictionsChange: (preds: Annotation[]) => void
	onOffsetChange: (offset: { x: number; y: number }) => void
	onZoomChange: (zoom: number) => void
	zoomLevel: number
	offset: { x: number; y: number }
	brushSize?: number
	brushOpacity?: number
}
