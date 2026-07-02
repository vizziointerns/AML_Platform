import { api_client } from './client'

export interface InferencePrediction {
	class_id: number
	class_name: string
	confidence: number
	x: number
	y: number
	w: number
	h: number
}

interface InferenceResponse {
	predictions: InferencePrediction[]
}

export async function run_inference(
	image_url: string,
	model_id?: number
): Promise<InferencePrediction[]> {
	const { data } = await api_client.post<InferenceResponse>(
		'/inference',
		{
			image_url,
			...(model_id !== undefined ? { model_id } : {})
		},
		{
			timeout: 120_000
		}
	)
	return data.predictions
}
