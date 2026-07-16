import { api_client } from './client'

export interface Point2D {
	x: number
	y: number
}

export interface PolygonResult {
	points: Point2D[]
}

interface SegmentResponse {
	polygons: PolygonResult[]
	class_name: string | null
}

export async function run_segmentation(
	image_url: string,
	prompt_type: 'point' | 'box',
	prompt_data: number[],
	class_name?: string
): Promise<PolygonResult[]> {
	const { data } = await api_client.post<SegmentResponse>(
		'/segment',
		{
			image_url,
			prompt_type,
			prompt_data,
			class_name
		},
		{
			timeout: 120_000
		}
	)
	return data.polygons
}

export async function run_auto_segmentation(
	image_url: string,
	class_name?: string,
	model_version: string = 'sam2.1'
): Promise<PolygonResult[]> {
	const { data } = await api_client.post<SegmentResponse>(
		'/segment',
		{
			image_url,
			auto_mode: true,
			class_name,
			model_version
		},
		{
			timeout: 180_000
		}
	)
	return data.polygons
}
