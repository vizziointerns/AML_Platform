export type Mode = 'select' | 'pan' | 'bbox' | 'polygon' | 'brush' | 'eraser' | 'segment'

export interface Comment {
	id: string
	userId: string
	text: string
	timestamp: number
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
	lines?: { points: number[]; brush_size: number; tool: 'brush' | 'eraser' }[]
	lockedBy?: string | null
	status?: 'pending' | 'approved' | 'needs_review'
	comments?: Comment[]
}

export interface Collaborator {
	id: string
	name: string
	color: string
	cursor?: { x: number; y: number }
	activeAnnotationId?: string | null
}

export interface Prediction extends Annotation {
	confidence: number
}

export interface ClassInfo {
	id: string
	name: string
	color: string
}

export type LayerActionSet = {
	selected_ann_id: string | undefined
	selected_prediction_id: string | undefined
	set_selected_ann_id: (id: string | undefined) => void
	set_selected_prediction_id: (id: string | undefined) => void
	set_annotations: (fn: (prev: Annotation[]) => Annotation[]) => void
}
