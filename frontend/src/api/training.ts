import { api_client } from './client'

export interface TrainingRun {
	id: number
	project_id: string
	dataset_id: string
	name: string
	model_type: string
	epochs: number
	status: 'Running' | 'Completed' | 'Failed' | 'Queued'
	accuracy: number | undefined
	loss: number | undefined
	current_epoch: number
	duration: string | undefined
	created_at: string
	started_at: string | undefined
	completed_at: string | undefined
	error_message: string | undefined
}

interface TrainingRunRaw {
	id: number
	project_id: string
	dataset_id: string
	name: string
	model_type: string
	epochs: number
	status: string
	accuracy: number | null
	loss: number | null
	current_epoch: number
	duration: string | null
	created_at: string
	started_at: string | null
	completed_at: string | null
	error_message: string | null
}

function to_run(raw: TrainingRunRaw): TrainingRun {
	return {
		id: raw.id,
		project_id: raw.project_id,
		dataset_id: raw.dataset_id,
		name: raw.name,
		model_type: raw.model_type,
		epochs: raw.epochs,
		status: raw.status as TrainingRun['status'],
		accuracy: raw.accuracy ?? undefined,
		loss: raw.loss ?? undefined,
		current_epoch: raw.current_epoch,
		duration: raw.duration ?? undefined,
		created_at: raw.created_at,
		started_at: raw.started_at ?? undefined,
		completed_at: raw.completed_at ?? undefined,
		error_message: raw.error_message ?? undefined
	}
}

interface TrainingRunListResponse {
	runs: TrainingRunRaw[]
}

interface CreateTrainingPayload {
	dataset_id: string
	name: string
	model_type: string
	epochs: number
}

interface UpdateTrainingPayload {
	name?: string
	status?: string
	accuracy?: number
	loss?: number
	current_epoch?: number
	duration?: string
}

export async function fetch_training_runs(project_id: string): Promise<TrainingRun[]> {
	const { data } = await api_client.get<TrainingRunListResponse>(`/training/${project_id}`)
	return (data?.runs ?? []).map(to_run)
}

export async function create_training_run(
	project_id: string,
	payload: CreateTrainingPayload
): Promise<TrainingRun> {
	const { data } = await api_client.post<TrainingRunRaw>(`/training/${project_id}`, payload)
	return to_run(data)
}

export async function update_training_run(
	project_id: string,
	run_id: number,
	payload: UpdateTrainingPayload
): Promise<TrainingRun> {
	const { data } = await api_client.patch<TrainingRunRaw>(
		`/training/${project_id}/${run_id}`,
		payload
	)
	return to_run(data)
}

export async function delete_training_run(project_id: string, run_id: number): Promise<void> {
	await api_client.delete(`/training/${project_id}/${run_id}`)
}
