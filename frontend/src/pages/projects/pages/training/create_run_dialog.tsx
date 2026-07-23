import { X } from 'lucide-react'
import { get_model_for_task, get_training_task_types } from '../../../../constants/models'
import type { TaskType } from '../../../../constants/models'
import { fetch_classes } from '../../../../api/classes'
import { create_training_run, start_training_run } from '../../../../api/training'
import { supabase } from '../../../../utils/supabase'
import type { DatasetInfo } from '../../../../hooks/use_datasets'

const DIALOG_BG = {
	overlay: (d: boolean) => (d ? 'bg-black/60' : 'bg-black/40'),
	card: (d: boolean) => (d ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'),
	heading: (d: boolean) => (d ? 'text-zinc-100' : 'text-zinc-900'),
	muted: (d: boolean) => (d ? 'text-zinc-400' : 'text-zinc-500'),
	input: (d: boolean) =>
		d
			? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
			: 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400'
}

export function new_training_dialog({
	is_dark_mode: d,
	datasets,
	open,
	on_close,
	on_create,
	is_creating,
	task_type,
	selected_training_task_type,
	set_selected_training_task_type,
	new_run_dataset_id,
	set_new_run_dataset_id,
	new_run_name,
	set_new_run_name,
	new_run_epochs,
	set_new_run_epochs
}: {
	is_dark_mode: boolean
	datasets: DatasetInfo[]
	open: boolean
	on_close: () => void
	on_create: (payload: {
		dataset_id: string
		name: string
		task_type: TaskType
		epochs: number
	}) => void
	is_creating: boolean
	task_type: TaskType
	selected_training_task_type: TaskType
	set_selected_training_task_type: (t: TaskType) => void
	new_run_dataset_id: string
	set_new_run_dataset_id: (id: string) => void
	new_run_name: string
	set_new_run_name: (name: string) => void
	new_run_epochs: number
	set_new_run_epochs: (epochs: number) => void
}) {
	const training_options = get_training_task_types(task_type)
	let model_display_name = 'Unknown Model'
	try {
		model_display_name = get_model_for_task(selected_training_task_type).name
	} catch {
		console.warn('Invalid task type found:', selected_training_task_type)
	}

	const effective_dataset_id =
		new_run_dataset_id || (datasets.length > 0 ? (datasets[0]?.id ?? '') : '')

	if (!open) return undefined

	const bg_overlay = DIALOG_BG.overlay(d)
	const bg_card = DIALOG_BG.card(d)
	const text_heading = DIALOG_BG.heading(d)
	const text_muted = DIALOG_BG.muted(d)
	const input_bg = DIALOG_BG.input(d)

	const handle_create = () => {
		if (!effective_dataset_id || !new_run_name.trim()) return
		on_create({
			dataset_id: effective_dataset_id,
			name: new_run_name.trim(),
			task_type: selected_training_task_type,
			epochs: new_run_epochs
		})
	}

	return (
		<div
			className={`fixed inset-0 z-50 flex items-center justify-center ${bg_overlay}`}
			onClick={on_close}
		>
			<div
				className={`w-full max-w-md rounded-xl border shadow-xl ${bg_card} p-6 space-y-5`}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between">
					<h2 className={`text-lg font-semibold ${text_heading}`}>New Training Run</h2>
					<button onClick={on_close} className={`p-1 rounded-md hover:bg-zinc-800 ${text_muted}`}>
						<X size={18} />
					</button>
				</div>
				<div className="space-y-4">
					<div>
						<label className={`block text-sm font-medium mb-1.5 ${text_heading}`}>Name</label>
						<input
							type="text"
							value={new_run_name}
							onChange={(e) => set_new_run_name(e.target.value)}
							placeholder="e.g. Object Detection (YOLO) v1"
							className={`w-full px-3 py-2 rounded-md border text-sm outline-none focus:ring-2 focus:ring-blue-500 ${input_bg}`}
						/>
					</div>
					<div>
						<label className={`block text-sm font-medium mb-1.5 ${text_heading}`}>Dataset</label>
						<select
							value={effective_dataset_id}
							onChange={(e) => set_new_run_dataset_id(e.target.value)}
							className={`w-full px-3 py-2 rounded-md border text-sm outline-none focus:ring-2 focus:ring-blue-500 ${input_bg}`}
						>
							{datasets.length === 0 ? (
								<option value="">No datasets available</option>
							) : (
								datasets.map((ds) => (
									<option key={ds.id} value={ds.id}>
										{ds.name}
									</option>
								))
							)}
						</select>
					</div>
					<div>
						<label className={`block text-sm font-medium mb-1.5 ${text_heading}`}>
							Training Task
						</label>
						{training_options.length > 1 ? (
							<select
								value={selected_training_task_type}
								onChange={(e) => set_selected_training_task_type(e.target.value as TaskType)}
								className={`w-full px-3 py-2 rounded-md border text-sm outline-none focus:ring-2 focus:ring-blue-500 ${input_bg}`}
							>
								{training_options.map((opt) => (
									<option key={opt} value={opt}>
										{opt === 'detect' ? 'Object Detection (YOLO)' : 'Segmentation (SAM)'}
									</option>
								))}
							</select>
						) : (
							<div className={`px-3 py-2 rounded-md border text-sm ${input_bg}`}>
								{model_display_name}
							</div>
						)}
					</div>
					<div>
						<label className={`block text-sm font-medium mb-1.5 ${text_heading}`}>Epochs</label>
						<input
							type="number"
							min={1}
							max={1000}
							value={new_run_epochs}
							onChange={(e) => set_new_run_epochs(Math.max(1, parseInt(e.target.value) || 1))}
							className={`w-full px-3 py-2 rounded-md border text-sm outline-none focus:ring-2 focus:ring-blue-500 ${input_bg}`}
						/>
					</div>
				</div>
				<div className="flex justify-end gap-3 pt-2">
					<button
						onClick={on_close}
						className={`px-4 py-2 text-sm font-medium rounded-md border border-zinc-700 ${text_muted} hover:bg-zinc-800 transition-colors`}
					>
						Cancel
					</button>
					<button
						onClick={handle_create}
						disabled={is_creating || !effective_dataset_id || !new_run_name.trim()}
						className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{is_creating ? 'Creating...' : 'Start Training'}
					</button>
				</div>
			</div>
		</div>
	)
}

export async function perform_create(
	project_id: string,
	payload: { dataset_id: string; name: string; task_type: TaskType; epochs: number },
	set_is_creating: (val: boolean) => void,
	set_error: (err: string | undefined) => void,
	set_is_new_dialog_open: (val: boolean) => void,
	load_runs: (show: boolean) => void
) {
	set_is_creating(true)
	try {
		const backend_classes = await fetch_classes(payload.dataset_id)
		if (backend_classes.length === 0) {
			throw new Error('No classes found. Create some classes in the annotation studio first.')
		}
		const class_payload = backend_classes.map((c, idx) => ({
			id: c.id,
			name: c.name,
			index: idx
		}))

		const { data: image_rows, error: image_err } = await supabase
			.from('dataset_images')
			.select('id, file_name, file_url, width, height')
			.eq('dataset_id', payload.dataset_id)
		if (image_err) {
			throw new Error(`Failed to fetch dataset images: ${image_err.message}`)
		}
		const image_payload = (image_rows ?? []).map((img) => ({
			id: img.id,
			file_name: img.file_name ?? 'unknown',
			file_url: img.file_url,
			width: img.width || 800,
			height: img.height || 600
		}))

		if (image_payload.length === 0) {
			throw new Error('No images found in the dataset.')
		}

		const run = await create_training_run(project_id, payload)
		await start_training_run(project_id, run.id, {
			images: image_payload,
			classes: class_payload
		})

		set_is_new_dialog_open(false)
		load_runs(false)
	} catch (err) {
		set_error(err instanceof Error ? err.message : 'Failed to create training run')
	} finally {
		set_is_creating(false)
	}
}
