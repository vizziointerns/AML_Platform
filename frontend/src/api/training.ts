import { api_client } from './client'
import type { TaskType } from '../constants/models'

export interface TrainingRun {
	id: number
	project_id: string
	dataset_id: string
	name: string
	task_type: TaskType
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
	metrics: string | undefined
}

interface TrainingRunRaw {
	id: number
	project_id: string
	dataset_id: string
	name: string
	task_type: TaskType
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
	metrics: string | null
}

function to_run(raw: TrainingRunRaw): TrainingRun {
	return {
		id: raw.id,
		project_id: raw.project_id,
		dataset_id: raw.dataset_id,
		name: raw.name,
		task_type: raw.task_type,
		epochs: raw.epochs,
		status: raw.status as TrainingRun['status'],
		accuracy: raw.accuracy ?? undefined,
		loss: raw.loss ?? undefined,
		current_epoch: raw.current_epoch,
		duration: raw.duration ?? undefined,
		created_at: raw.created_at,
		started_at: raw.started_at ?? undefined,
		completed_at: raw.completed_at ?? undefined,
		error_message: raw.error_message ?? undefined,
		metrics: raw.metrics ?? undefined
	}
}

interface TrainingRunListResponse {
	runs: TrainingRunRaw[]
}

interface CreateTrainingPayload {
	dataset_id: string
	name: string
	task_type: TaskType
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

export async function download_weights_url(project_id: string, run_id: number): Promise<string> {
	const base_url = import.meta.env.VITE_API_BASE_URL ?? '/api'
	return `${base_url}/training/${project_id}/${run_id}/weights`
}

export interface StartTrainingImage {
	id: string
	file_name: string
	file_url: string
	width: number
	height: number
}

export interface StartTrainingClass {
	id: string
	name: string
	index: number
}

export interface StartTrainingPayload {
	images: StartTrainingImage[]
	classes: StartTrainingClass[]
}

export async function start_training_run(
	project_id: string,
	run_id: number,
	payload: StartTrainingPayload
): Promise<TrainingRun> {
	const { data } = await api_client.post<TrainingRunRaw>(
		`/training/${project_id}/${run_id}/start`,
		payload
	)
	return to_run(data)
}
