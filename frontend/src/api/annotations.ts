import { api_client } from './client'
import type { Annotation } from '../pages/projects/pages/annotation/types'

interface AnnotationPayload {
	image_id: string
	annotation_id: string
	type: string
	class_id: string
	x: number
	y: number
	w: number
	h: number
	points: { x: number; y: number }[] | undefined
	lines: { points: number[]; brush_size: number; tool: string }[] | undefined
}

interface AnnotationListResponse {
	annotations: AnnotationPayload[]
}

function to_payload(ann: Annotation, image_id: string): AnnotationPayload {
	return {
		image_id,
		annotation_id: ann.id,
		type: ann.type,
		class_id: ann.classId,
		x: ann.x,
		y: ann.y,
		w: ann.w,
		h: ann.h,
		points: ann.points ?? undefined,
		lines:
			ann.lines?.map((l) => ({
				points: l.points,
				brush_size: l.brush_size,
				tool: l.tool
			})) ?? undefined
	}
}

function from_payload(p: AnnotationPayload): Annotation {
	return {
		id: p.annotation_id,
		type: p.type as Annotation['type'],
		classId: p.class_id,
		x: p.x,
		y: p.y,
		w: p.w,
		h: p.h,
		points: p.points,
		lines: p.lines?.map((l) => ({
			points: l.points,
			brush_size: l.brush_size,
			tool: l.tool as 'brush' | 'eraser'
		}))
	}
}

export async function fetch_annotations(image_id: string): Promise<Annotation[]> {
	const { data } = await api_client.get<AnnotationListResponse>(`/annotations/${image_id}`)
	return (data?.annotations ?? []).map(from_payload)
}

export async function save_annotations(
	image_id: string,
	annotations: Annotation[]
): Promise<Annotation[]> {
	const payload = annotations.map((a) => to_payload(a, image_id))
	const { data } = await api_client.post<AnnotationListResponse>(
		`/annotations/${image_id}`,
		payload
	)
	return (data?.annotations ?? []).map(from_payload)
}

interface BatchItem {
	image_id: string
	annotations: Annotation[]
}

interface BatchResponse {
	results: AnnotationListResponse[]
}

export async function save_annotations_batch(datasets: BatchItem[]): Promise<Annotation[][]> {
	const payload = {
		datasets: datasets.map((d) => ({
			image_id: d.image_id,
			annotations: d.annotations.map((a) => to_payload(a, d.image_id))
		}))
	}
	const { data } = await api_client.post<BatchResponse>('/annotations/batch', payload)
	return (data?.results ?? []).map((r) => (r.annotations ?? []).map(from_payload))
}
