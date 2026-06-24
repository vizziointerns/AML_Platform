import { api_client } from './client'
import type { ClassInfo } from '../pages/projects/pages/annotation/types'

interface ClassPayload {
	id: number
	dataset_id: string
	class_id: string
	name: string
	color: string
	index: number
}

interface ClassListResponse {
	classes: ClassPayload[]
}

function to_class_info(raw: ClassPayload): ClassInfo {
	return { id: raw.class_id, name: raw.name, color: raw.color }
}

function to_create_payload(c: ClassInfo): { class_id: string; name: string; color: string } {
	return { class_id: c.id, name: c.name, color: c.color }
}

export async function fetch_classes(dataset_id: string): Promise<ClassInfo[]> {
	const { data } = await api_client.get<ClassListResponse>(`/classes/${dataset_id}`)
	return (data?.classes ?? []).map(to_class_info)
}

export async function save_classes_to_backend(
	dataset_id: string,
	classes: ClassInfo[]
): Promise<ClassInfo[]> {
	const payload = classes.map(to_create_payload)
	const { data } = await api_client.put<ClassListResponse>(`/classes/${dataset_id}`, payload)
	return (data?.classes ?? []).map(to_class_info)
}
