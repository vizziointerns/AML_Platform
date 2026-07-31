import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { use_project_store } from '../../../../store/projectStore'
import type { TaskType } from '../../../../constants/models'
import { Activity, Plus } from 'lucide-react'
import {
	fetch_training_runs,
	delete_training_run,
	type TrainingRun
} from '../../../../api/training'
import { fetch_classes } from '../../../../api/classes'
import { export_yolo } from '../../../../api/export'
import { supabase } from '../../../../utils/supabase'
import { use_datasets } from '../../../../hooks/use_datasets'
import type { DatasetInfo } from '../../../../hooks/use_datasets'
import { new_training_dialog, perform_create } from './create_run_dialog'
import { training_runs_table } from './run_card'
import {
	stat_card,
	compute_selected_stats,
	empty_runs_state,
	render_model_selector
} from './training_stats'

async function perform_load_runs(
	project_id: string,
	show_loading: boolean,
	set_is_loading: (val: boolean) => void,
	set_error: (err: string | undefined) => void,
	set_runs: (runs: TrainingRun[]) => void
) {
	if (show_loading) set_is_loading(true)
	set_error(undefined)
	try {
		const data = await fetch_training_runs(project_id)
		set_runs(data)
	} catch (err) {
		set_error(err instanceof Error ? err.message : 'Failed to load training runs')
	} finally {
		if (show_loading) set_is_loading(false)
	}
}

async function perform_delete(
	project_id: string,
	run_id: number,
	set_deleting_id: (id: number | undefined) => void,
	set_error: (err: string | undefined) => void,
	load_runs: (show: boolean) => void
) {
	set_deleting_id(run_id)
	set_error(undefined)
	try {
		await delete_training_run(project_id, run_id)
		load_runs(false)
	} catch (err) {
		set_error(err instanceof Error ? err.message : 'Failed to delete training run')
	} finally {
		set_deleting_id(undefined)
	}
}

async function perform_export(
	dataset_id: string,
	set_is_exporting: (val: boolean) => void,
	set_error: (err: string | undefined) => void
) {
	set_is_exporting(true)
	set_error(undefined)
	try {
		const backend_classes = await fetch_classes(dataset_id)
		if (backend_classes.length === 0) {
			throw new Error('No classes found. Create some classes in the annotation studio first.')
		}
		const class_payload = backend_classes.map((c, idx) => ({
			id: c.id,
			name: c.name,
			index: idx
		}))
		const { data: image_rows } = await supabase
			.from('dataset_images')
			.select('id, file_name, file_url, width, height')
			.eq('dataset_id', dataset_id)
		const image_payload = (image_rows ?? []).map((img) => ({
			id: img.id,
			file_name: img.file_name ?? 'unknown',
			width: img.width || 800,
			height: img.height || 600,
			file_url: img.file_url
		}))
		if (image_payload.length === 0) {
			throw new Error('No images found in the dataset.')
		}
		const blob = await export_yolo({
			dataset_id,
			images: image_payload,
			classes: class_payload
		})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `dataset_${dataset_id}_yolo.zip`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
	} catch (err) {
		set_error(err instanceof Error ? err.message : 'Export failed')
	} finally {
		set_is_exporting(false)
	}
}

interface RenderTrainingProps {
	project_id: string
	task_type: TaskType | undefined
	datasets: DatasetInfo[]
	is_dark_mode: boolean
	runs: TrainingRun[]
	is_loading: boolean
	is_exporting: boolean
	error: string | undefined
	set_error: (err: string | undefined) => void
	is_new_dialog_open: boolean
	is_creating: boolean
	is_fetching_project: boolean
	deleting_id: number | undefined
	new_run_dataset_id: string
	set_new_run_dataset_id: (id: string) => void
	new_run_name: string
	set_new_run_name: (name: string) => void
	new_run_epochs: number
	set_new_run_epochs: (epochs: number) => void
	selected_training_task_type: TaskType
	set_selected_training_task_type: (t: TaskType) => void
	stats: { active_jobs: number; avg_accuracy: string; avg_loss: string; total_hours: string }
	set_is_new_dialog_open: (val: boolean) => void
	handle_export: () => void
	handle_create: (payload: {
		dataset_id: string
		name: string
		task_type: TaskType
		epochs: number
	}) => void
	handle_delete: (id: number) => void
	handle_open: (run_id: number) => void
	selected_model_id: number | undefined
	set_selected_model_id: (id: number | undefined) => void
	navigate: (path: string) => void
}

function render_training_header(props: RenderTrainingProps) {
	const text_muted = props.is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_heading = props.is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'

	return (
		<div className="page-header">
			<div>
				<h1 className={`text-2xl font-semibold tracking-tight ${text_heading}`}>Training</h1>
				<p className={`text-sm mt-1 ${text_muted}`}>
					Manage model training jobs and monitor progress.
				</p>
			</div>
			<div className="flex items-center gap-2">
				<button
					className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
					onClick={() => props.set_is_new_dialog_open(true)}
					disabled={!props.task_type}
				>
					<Plus size={16} /> New Training
				</button>
			</div>
		</div>
	)
}

function render_training_page_content(props: RenderTrainingProps) {
	const text_muted = props.is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	return (
		<>
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
				<p className={`text-sm ${text_muted}`}>
					{props.selected_model_id !== undefined
						? 'Showing metrics for the selected model'
						: 'Aggregate metrics across all models'}
				</p>
				{render_model_selector({
					runs: props.runs,
					selected_id: props.selected_model_id,
					on_select: props.set_selected_model_id,
					is_dark_mode: props.is_dark_mode
				})}
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{stat_card({
					label: 'Active Jobs',
					value: String(props.stats.active_jobs),
					is_dark_mode: props.is_dark_mode
				})}
				{stat_card({
					label: 'Avg Accuracy',
					value: props.stats.avg_accuracy,
					is_dark_mode: props.is_dark_mode
				})}
				{stat_card({
					label: 'Avg Loss',
					value: props.stats.avg_loss,
					is_dark_mode: props.is_dark_mode
				})}
				{stat_card({
					label: 'Total GPU Hours',
					value: props.stats.total_hours,
					is_dark_mode: props.is_dark_mode
				})}
			</div>
			{props.is_loading && (
				<div className={`flex items-center justify-center py-20 ${text_muted}`}>
					<Activity size={20} className="animate-spin mr-2" /> Loading training runs...
				</div>
			)}
			{!props.is_loading &&
				props.runs.length === 0 &&
				empty_runs_state({
					set_is_new_dialog_open: props.set_is_new_dialog_open,
					is_dark_mode: props.is_dark_mode
				})}
			{!props.is_loading &&
				props.runs.length > 0 &&
				training_runs_table({
					runs: props.runs,
					is_dark_mode: props.is_dark_mode,
					deleting_id: props.deleting_id,
					handle_delete: props.handle_delete,
					handle_error: props.set_error,
					handle_open: props.handle_open
				})}
		</>
	)
}

function render_training_page(props: RenderTrainingProps) {
	const text_muted = props.is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_heading = props.is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const border_subtle = props.is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = props.is_dark_mode ? 'bg-zinc-900' : 'bg-white'

	return (
		<div className="page-layout">
			<div className="page-content">
				{render_training_header(props)}

				{props.is_fetching_project && (
					<div
						className={`mt-6 p-8 text-center border rounded-xl flex flex-col items-center justify-center ${border_subtle} ${bg_card}`}
					>
						<Activity size={24} className={`animate-spin mb-2 ${text_muted}`} />
						<p className={`text-sm ${text_muted}`}>Loading project configuration...</p>
					</div>
				)}

				{!props.task_type && !props.is_fetching_project && (
					<div className={`mt-6 p-8 text-center border rounded-xl ${border_subtle} ${bg_card}`}>
						<h3 className={`text-lg font-medium mb-2 ${text_heading}`}>No Model Selected</h3>
						<p className={`text-sm mb-4 ${text_muted}`}>
							You must select a model architecture before starting a training run.
						</p>
						<button
							onClick={() => props.navigate(`/projects/${props.project_id}/models`)}
							className="btn-primary inline-flex"
						>
							Go to Models Page
						</button>
					</div>
				)}

				{props.task_type && props.error && (
					<div
						className={`px-4 py-3 rounded-lg text-sm text-red-500 ${props.is_dark_mode ? 'bg-red-500/10' : 'bg-red-50'}`}
					>
						{props.error}
					</div>
				)}

				{props.task_type && render_training_page_content(props)}
			</div>

			{props.task_type &&
				new_training_dialog({
					is_dark_mode: props.is_dark_mode,
					datasets: props.datasets,
					open: props.is_new_dialog_open,
					on_close: () => props.set_is_new_dialog_open(false),
					on_create: props.handle_create,
					is_creating: props.is_creating,
					task_type: props.task_type,
					selected_training_task_type: props.selected_training_task_type,
					set_selected_training_task_type: props.set_selected_training_task_type,
					new_run_dataset_id: props.new_run_dataset_id,
					set_new_run_dataset_id: props.set_new_run_dataset_id,
					new_run_name: props.new_run_name,
					set_new_run_name: props.set_new_run_name,
					new_run_epochs: props.new_run_epochs,
					set_new_run_epochs: props.set_new_run_epochs
				})}
		</div>
	)
}

export default function training_page({ is_dark_mode }: { is_dark_mode: boolean }) {
	const navigate = useNavigate()
	const { projectId: project_id } = useParams<{ projectId: string }>()
	const { datasets } = use_datasets(project_id ?? '')
	const { updateProject: update_project_store } = use_project_store()

	const [task_type, set_task_type] = useState<TaskType | undefined>(undefined)
	const [is_fetching_project, set_is_fetching_project] = useState(true)
	const [runs, set_runs] = useState<TrainingRun[]>([])
	const [is_loading, set_is_loading] = useState(true)
	const [is_exporting, set_is_exporting] = useState(false)
	const [error, set_error] = useState<string | undefined>(undefined)
	const [is_new_dialog_open, set_is_new_dialog_open] = useState(false)
	const [is_creating, set_is_creating] = useState(false)
	const [deleting_id, set_deleting_id] = useState<number | undefined>(undefined)
	const [selected_model_id, set_selected_model_id] = useState<number | undefined>(undefined)

	const [new_run_dataset_id, set_new_run_dataset_id] = useState('')
	const [new_run_name, set_new_run_name] = useState('')
	const [new_run_epochs, set_new_run_epochs] = useState(50)
	const [selected_training_task_type, set_selected_training_task_type] =
		useState<TaskType>('detect')

	useEffect(() => {
		if (!project_id) {
			set_is_fetching_project(false)
			return
		}

		let is_current = true
		const fetch_project = async () => {
			try {
				const { data, error: err } = await supabase
					.from('projects')
					.select('task_type')
					.eq('id', project_id)
					.single()

				if (!is_current) return

				if (err) {
					console.error('Failed to fetch project task type:', err)
				} else if (data) {
					const pt = data.task_type as TaskType
					set_task_type(pt)
					set_selected_training_task_type(pt === 'cog' ? 'detect' : pt)
					update_project_store(project_id, { task_type: pt })
				}
			} catch (err) {
				console.error(err)
			} finally {
				if (is_current) {
					set_is_fetching_project(false)
				}
			}
		}

		fetch_project()
		return () => {
			is_current = false
		}
	}, [project_id, update_project_store])

	const load_runs = useCallback(
		async (show_loading = false) => {
			if (!project_id) {
				set_is_loading(false)
				return
			}
			await perform_load_runs(project_id, show_loading, set_is_loading, set_error, set_runs)
		},
		[project_id]
	)

	useEffect(() => {
		load_runs(true)
		const interval = setInterval(() => load_runs(false), 3000)
		return () => clearInterval(interval)
	}, [load_runs])

	useEffect(() => {
		if (selected_model_id !== undefined && !runs.some((r) => r.id === selected_model_id)) {
			set_selected_model_id(undefined)
		}
	}, [runs, selected_model_id])

	const handle_create = async (payload: {
		dataset_id: string
		name: string
		task_type: TaskType
		epochs: number
	}) => {
		if (!project_id) return
		await perform_create(
			project_id,
			payload,
			set_is_creating,
			set_error,
			set_is_new_dialog_open,
			load_runs
		)
	}

	const handle_export = useCallback(async () => {
		const dataset_id = datasets[0]?.id
		if (!dataset_id) {
			set_error('No dataset available for export')
			return
		}
		await perform_export(dataset_id, set_is_exporting, set_error)
	}, [datasets])

	const handle_delete = async (run_id: number) => {
		if (!project_id) return
		await perform_delete(project_id, run_id, set_deleting_id, set_error, load_runs)
	}

	const handle_open = useCallback(
		(run_id: number) => {
			navigate(`/projects/${project_id}/training/${run_id}`)
		},
		[navigate, project_id]
	)

	const selected_run = runs.find((r) => r.id === selected_model_id)
	const stats = compute_selected_stats(selected_run, runs)

	return render_training_page({
		project_id: project_id ?? '',
		task_type,
		datasets,
		is_dark_mode,
		runs,
		is_loading,
		is_exporting,
		error,
		set_error,
		is_new_dialog_open,
		is_creating,
		is_fetching_project,
		deleting_id,
		new_run_dataset_id,
		set_new_run_dataset_id,
		new_run_name,
		set_new_run_name,
		new_run_epochs,
		set_new_run_epochs,
		selected_training_task_type,
		set_selected_training_task_type,
		stats,
		set_is_new_dialog_open,
		handle_export,
		handle_create,
		handle_delete,
		handle_open,
		selected_model_id,
		set_selected_model_id,
		navigate
	})
}
