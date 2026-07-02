export type TaskType = 'detect' | 'segment'
export type ModelId = 'yolo' | 'sam'

export interface ModelInfo {
	id: ModelId
	name: string
	task_type: TaskType
	description: string
	status: string
}

export const SUPPORTED_MODELS: ModelInfo[] = [
	{
		id: 'yolo',
		name: 'YOLO',
		task_type: 'detect',
		description: 'State-of-the-art, real-time object detection model.',
		status: 'Available'
	},
	{
		id: 'sam',
		name: 'SAM',
		task_type: 'segment',
		description: "Meta's foundation model for image segmentation.",
		status: 'Available'
	}
]

export function get_model_for_task(task: TaskType): ModelInfo {
	const model = SUPPORTED_MODELS.find((m) => m.task_type === task)
	if (!model) {
		throw new Error(`No model found for task type: ${task}`)
	}
	return model
}
