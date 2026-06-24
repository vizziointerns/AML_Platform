import { api_client } from './client'

export interface ExportImageInfo {
	id: string
	file_name: string
	width: number
	height: number
	file_url: string
}

export interface ExportClassInfo {
	id: string
	name: string
	index: number
}

interface ExportRequest {
	dataset_id: string
	images: ExportImageInfo[]
	classes: ExportClassInfo[]
	split_ratio?: number
}

export async function export_yolo(payload: ExportRequest): Promise<Blob> {
	const response = await api_client.post('/datasets/export/yolo', payload, {
		responseType: 'blob'
	})
	return response.data as Blob
}
