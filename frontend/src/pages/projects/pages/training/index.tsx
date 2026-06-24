import { useState, useEffect, useCallback, Fragment } from 'react'
import { useParams } from 'react-router-dom'
import {
	Square,
	Download,
	Clock,
	BarChart3,
	Activity,
	Plus,
	X,
	Trash2,
	FileDown
} from 'lucide-react'
import {
	fetch_training_runs,
	create_training_run,
	delete_training_run,
	start_training_run,
	type TrainingRun
} from '../../../../api/training'
import { fetch_classes } from '../../../../api/classes'
import { export_yolo } from '../../../../api/export'
import { supabase } from '../../../../utils/supabase'
import { use_datasets } from '../../../../hooks/use_datasets'
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

function new_training_dialog({
	is_dark_mode: d,
	datasets,
	open,
	on_close,
	on_create,
	is_creating
}: {
	is_dark_mode: boolean
	datasets: DatasetInfo[]
	open: boolean
	on_close: () => void
	on_create: (payload: {
		dataset_id: string
		name: string
		model_type: string
		epochs: number
	}) => void
	is_creating: boolean
}) {
	const [dataset_id, set_dataset_id] = useState(datasets[0]?.id ?? '')
	const [name, set_name] = useState('')
	const [epochs, set_epochs] = useState(50)

	const effective_dataset_id = dataset_id || (datasets.length > 0 ? (datasets[0]?.id ?? '') : '')

	if (!open) return undefined

	const bg_overlay = DIALOG_BG.overlay(d)
	const bg_card = DIALOG_BG.card(d)
	const text_heading = DIALOG_BG.heading(d)
	const text_muted = DIALOG_BG.muted(d)
	const input_bg = DIALOG_BG.input(d)

	const handle_create = () => {
		if (!effective_dataset_id || !name.trim()) return
		on_create({
			dataset_id: effective_dataset_id,
			name: name.trim(),
			model_type: 'Object Detection (YOLO)',
			epochs
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
							value={name}
							onChange={(e) => set_name(e.target.value)}
							placeholder="e.g. Object Detection (YOLO) v1"
							className={`w-full px-3 py-2 rounded-md border text-sm outline-none focus:ring-2 focus:ring-blue-500 ${input_bg}`}
						/>
					</div>
					<div>
						<label className={`block text-sm font-medium mb-1.5 ${text_heading}`}>Dataset</label>
						<select
							value={effective_dataset_id}
							onChange={(e) => set_dataset_id(e.target.value)}
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
						<label className={`block text-sm font-medium mb-1.5 ${text_heading}`}>Model Type</label>
						<div className={`px-3 py-2 rounded-md border text-sm ${input_bg}`}>
							Object Detection (YOLO)
						</div>
					</div>
					<div>
						<label className={`block text-sm font-medium mb-1.5 ${text_heading}`}>Epochs</label>
						<input
							type="number"
							min={1}
							max={1000}
							value={epochs}
							onChange={(e) => set_epochs(Math.max(1, parseInt(e.target.value) || 1))}
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
						disabled={is_creating || !effective_dataset_id || !name.trim()}
						className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{is_creating ? 'Creating...' : 'Start Training'}
					</button>
				</div>
			</div>
		</div>
	)
}

function stat_card({
	label,
	value,
	is_dark_mode
}: {
	label: string
	value: string
	is_dark_mode: boolean
}) {
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	return (
		<div className={`stat-card ${bg_card}`}>
			<div className={`text-sm font-medium ${text_muted} mb-3`}>{label}</div>
			<div className={`text-2xl font-bold tracking-tight ${text_heading}`}>{value}</div>
		</div>
	)
}

function status_tag(status: string) {
	switch (status) {
		case 'Running':
			return (
				<span className="flex items-center gap-1.5 text-blue-500 text-xs font-medium">
					<Activity size={14} className="animate-pulse" /> Running
				</span>
			)
		case 'Completed':
			return (
				<span className="flex items-center gap-1.5 text-emerald-500 text-xs font-medium">
					<Download size={14} /> Completed
				</span>
			)
		case 'Failed':
			return (
				<span className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
					<Square size={14} /> Failed
				</span>
			)
		default:
			return (
				<span className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium">
					<Clock size={14} /> Queued
				</span>
			)
	}
}

function compute_stats(runs: TrainingRun[]) {
	const active = runs.filter((r) => r.status === 'Running').length
	const completed = runs.filter((r) => r.status === 'Completed')
	const with_accuracy = completed.filter((r) => r.accuracy !== undefined)
	const with_loss = completed.filter((r) => r.loss !== undefined)
	const avg_accuracy = with_accuracy.length
		? with_accuracy.reduce((sum, r) => sum + r.accuracy!, 0) / with_accuracy.length
		: 0
	const avg_loss = with_loss.length
		? with_loss.reduce((sum, r) => sum + r.loss!, 0) / with_loss.length
		: 0
	const total_duration_hours = runs.reduce((sum, r) => {
		if (!r.duration) return sum
		const parts = r.duration.match(/(\d+)h\s*(\d+)?m?/)
		if (!parts) return sum
		return sum + parseInt(parts[1] ?? '0') + parseInt(parts[2] ?? '0') / 60
	}, 0)
	return {
		active_jobs: active,
		avg_accuracy: completed.length ? (avg_accuracy * 100).toFixed(1) + '%' : '—',
		avg_loss: completed.length ? avg_loss.toFixed(2) : '—',
		total_hours: total_duration_hours.toFixed(1)
	}
}

function mini_svg_line_chart(
	label: string,
	color: string,
	data: { epoch: number; value: number }[],
	is_dark_mode: boolean
) {
	if (data.length < 2) return undefined

	const width = 200
	const height = 80
	const pad = { top: 4, right: 36, bottom: 16, left: 4 }

	const xs = data.map((d) => d.epoch)
	const vals = data.map((d) => d.value)
	const x_min = xs[0]!
	const x_max = xs[xs.length - 1]!
	const y_min = 0
	const y_max = Math.max(...vals) * 1.2 || 1

	const scale_x = (v: number) =>
		pad.left + ((v - x_min) / (x_max - x_min || 1)) * (width - pad.left - pad.right)
	const scale_y = (v: number) =>
		height - pad.bottom - ((v - y_min) / (y_max - y_min || 1)) * (height - pad.top - pad.bottom)

	const points = data.map((d) => `${scale_x(d.epoch)},${scale_y(d.value)}`).join(' ')

	const y_ticks = [0, y_max / 2, y_max]
	const grid_lines = is_dark_mode ? '#27272a' : '#e4e4e7'
	const axis_color = is_dark_mode ? '#52525b' : '#d4d4d8'

	return (
		<div className="flex flex-col items-center">
			<svg width={width} height={height}>
				{y_ticks.map((yt, i) => {
					const y = scale_y(yt)
					return (
						<g key={i}>
							<line
								x1={pad.left}
								y1={y}
								x2={width - pad.right}
								y2={y}
								stroke={grid_lines}
								strokeWidth={0.5}
							/>
							<text x={width - pad.right + 4} y={y + 3} fill={axis_color} fontSize={8}>
								{label === 'Accuracy' ? (yt * 100).toFixed(0) : yt.toFixed(2)}
							</text>
						</g>
					)
				})}
				<polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
				<text x={pad.left} y={height - 2} fill={axis_color} fontSize={8}>
					{x_min}
				</text>
				<text x={width - pad.right - 16} y={height - 2} fill={axis_color} fontSize={8}>
					{x_max}
				</text>
			</svg>
			<span className="text-xs font-medium mt-1" style={{ color }}>
				{label}
			</span>
		</div>
	)
}

function training_chart(run: TrainingRun, is_dark_mode: boolean) {
	if (!run.metrics) return undefined
	let chart_data: { epoch: number; accuracy?: number; loss?: number }[] = []
	try {
		const parsed = JSON.parse(run.metrics)
		if (Array.isArray(parsed)) {
			chart_data = parsed
		}
	} catch {
		/* ignore */
	}
	if (chart_data.length < 2) return undefined

	const acc_data = chart_data
		.filter((d) => d.accuracy !== undefined)
		.map((d) => ({ epoch: d.epoch, value: d.accuracy! }))
	const loss_data = chart_data
		.filter((d) => d.loss !== undefined)
		.map((d) => ({ epoch: d.epoch, value: d.loss! }))

	if (acc_data.length < 2 && loss_data.length < 2) return undefined

	return (
		<tr>
			<td colSpan={8} className="px-6 py-3">
				<div className="flex gap-6 flex-wrap">
					{mini_svg_line_chart('Accuracy', '#22c55e', acc_data, is_dark_mode)}
					{mini_svg_line_chart('Loss', '#ef4444', loss_data, is_dark_mode)}
				</div>
			</td>
		</tr>
	)
}

function progress_bar_color(status: string): string {
	if (status === 'Completed') return 'bg-emerald-500'
	if (status === 'Failed') return 'bg-red-500'
	if (status === 'Running') return 'bg-blue-500'
	return 'bg-zinc-500'
}

function table_row({
	run,
	is_dark_mode,
	bg_subtle,
	text_heading,
	text_muted,
	deleting_id,
	on_delete
}: {
	run: TrainingRun
	is_dark_mode: boolean
	bg_subtle: string
	text_heading: string
	text_muted: string
	deleting_id: number | undefined
	on_delete: (id: number) => void
}) {
	const pct = run.epochs > 0 ? Math.round((run.current_epoch / run.epochs) * 100) : 0
	const bar_color = progress_bar_color(run.status)
	const progress_bg = is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'
	return (
		<>
			<tr className={`hover:${bg_subtle} transition-colors`}>
				<td className="px-6 py-4">
					<div className={`font-medium ${text_heading}`}>{run.name}</div>
				</td>
				<td className="px-6 py-4">
					<div className={text_heading}>{run.model_type || '—'}</div>
					<div className={`text-xs ${text_muted}`}>
						{run.dataset_id ? `Dataset: ${run.dataset_id.slice(0, 8)}...` : '—'}
					</div>
				</td>
				<td className="px-6 py-4 w-40">
					<div className="flex items-center gap-2">
						<div className={`h-1.5 flex-1 rounded-full overflow-hidden ${progress_bg}`}>
							<div className={`h-full rounded-full ${bar_color}`} style={{ width: `${pct}%` }} />
						</div>
						<span className={`text-xs ${text_muted} w-12`}>
							{run.current_epoch}/{run.epochs}
						</span>
					</div>
				</td>
				<td className={`px-6 py-4 ${text_heading}`}>
					{run.accuracy !== undefined ? `${(run.accuracy * 100).toFixed(1)}%` : '—'}
				</td>
				<td className={`px-6 py-4 ${text_heading}`}>
					{run.loss !== undefined ? run.loss.toFixed(2) : '—'}
				</td>
				<td className={`px-6 py-4 ${text_muted}`}>{run.duration || '—'}</td>
				<td className="px-6 py-4">{status_tag(run.status)}</td>
				<td className="px-6 py-4">
					<button
						onClick={() => on_delete(run.id)}
						disabled={deleting_id === run.id}
						className={`p-1.5 rounded-md text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors ${deleting_id === run.id ? 'opacity-50 cursor-not-allowed' : ''}`}
						title="Delete run"
					>
						{deleting_id === run.id ? (
							<Activity size={14} className="animate-spin" />
						) : (
							<Trash2 size={14} />
						)}
					</button>
				</td>
			</tr>
			{run.status === 'Failed' && run.error_message && (
				<tr>
					<td colSpan={8} className="px-6 py-3">
						<div
							className={`text-xs text-red-500 ${is_dark_mode ? 'bg-red-500/5' : 'bg-red-50'} rounded-md p-3 font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto`}
						>
							{run.error_message}
						</div>
					</td>
				</tr>
			)}
		</>
	)
}

export default function training_page({ is_dark_mode }: { is_dark_mode: boolean }) {
	const { projectId: project_id } = useParams<{ projectId: string }>()
	const { datasets } = use_datasets(project_id ?? '')
	const [runs, set_runs] = useState<TrainingRun[]>([])
	const [is_loading, set_is_loading] = useState(true)
	const [is_exporting, set_is_exporting] = useState(false)
	const [error, set_error] = useState<string | undefined>(undefined)
	const [is_new_dialog_open, set_is_new_dialog_open] = useState(false)
	const [is_creating, set_is_creating] = useState(false)
	const [deleting_id, set_deleting_id] = useState<number | undefined>(undefined)

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'

	const load_runs = useCallback(
		async (show_loading = false) => {
			if (!project_id) {
				set_is_loading(false)
				return
			}
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
		},
		[project_id]
	)

	useEffect(() => {
		load_runs(true)
		const interval = setInterval(() => load_runs(false), 3000)
		return () => clearInterval(interval)
	}, [load_runs])

	const handle_create = async (payload: {
		dataset_id: string
		name: string
		model_type: string
		epochs: number
	}) => {
		if (!project_id) return
		set_is_creating(true)
		try {
			const run = await create_training_run(project_id, payload)

			const backend_classes = await fetch_classes(payload.dataset_id)
			const class_payload = backend_classes.map((c, idx) => ({
				id: c.id,
				name: c.name,
				index: idx
			}))

			const { data: image_rows } = await supabase
				.from('dataset_images')
				.select('id, file_name, file_url, width, height')
				.eq('dataset_id', payload.dataset_id)
			const image_payload = (image_rows ?? []).map((img) => ({
				id: img.id,
				file_name: img.file_name ?? 'unknown',
				file_url: img.file_url,
				width: img.width || 800,
				height: img.height || 600
			}))

			if (class_payload.length > 0 && image_payload.length > 0) {
				await start_training_run(project_id, run.id, {
					images: image_payload,
					classes: class_payload
				})
			}

			set_is_new_dialog_open(false)
			load_runs(false)
		} catch (err) {
			set_error(err instanceof Error ? err.message : 'Failed to create training run')
		} finally {
			set_is_creating(false)
		}
	}

	const handle_export = useCallback(async () => {
		const dataset_id = datasets[0]?.id
		if (!dataset_id) {
			set_error('No dataset available for export')
			return
		}
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
	}, [datasets])

	const handle_delete = async (run_id: number) => {
		if (!project_id) return
		set_deleting_id(run_id)
		try {
			await delete_training_run(project_id, run_id)
			load_runs(false)
		} catch (err) {
			set_error(err instanceof Error ? err.message : 'Failed to delete training run')
		} finally {
			set_deleting_id(undefined)
		}
	}

	const stats = compute_stats(runs)

	return (
		<div className="page-layout">
			<div className="page-content">
				<div className="page-header">
					<div>
						<h1 className={`text-2xl font-semibold tracking-tight ${text_heading}`}>Training</h1>
						<p className={`text-sm mt-1 ${text_muted}`}>
							Manage model training jobs and monitor progress.
						</p>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={handle_export}
							disabled={is_exporting || datasets.length === 0}
							className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
								is_dark_mode
									? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
									: 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
							}`}
						>
							<FileDown size={16} className="inline mr-1.5" />
							{is_exporting ? 'Exporting...' : 'Export YOLO'}
						</button>
						<button className="btn-primary" onClick={() => set_is_new_dialog_open(true)}>
							<Plus size={16} /> New Training
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					{stat_card({ label: 'Active Jobs', value: String(stats.active_jobs), is_dark_mode })}
					{stat_card({ label: 'Avg Accuracy', value: stats.avg_accuracy, is_dark_mode })}
					{stat_card({ label: 'Avg Loss', value: stats.avg_loss, is_dark_mode })}
					{stat_card({ label: 'Total GPU Hours', value: stats.total_hours, is_dark_mode })}
				</div>

				{error && (
					<div
						className={`px-4 py-3 rounded-lg text-sm text-red-500 ${is_dark_mode ? 'bg-red-500/10' : 'bg-red-50'}`}
					>
						{error}
					</div>
				)}

				{is_loading ? (
					<div className={`flex items-center justify-center py-20 ${text_muted}`}>
						<Activity size={20} className="animate-spin mr-2" /> Loading training runs...
					</div>
				) : runs.length === 0 ? (
					<div className={`rounded-xl border ${border_subtle} ${bg_card} p-12 text-center`}>
						<div className={`text-lg font-medium mb-2 ${text_heading}`}>No training runs yet</div>
						<p className={`text-sm ${text_muted} mb-6`}>
							Start your first training run to train a model on your dataset.
						</p>
						<button
							onClick={() => set_is_new_dialog_open(true)}
							className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
						>
							<Plus size={16} className="inline mr-1.5" /> New Training Run
						</button>
					</div>
				) : (
					<div className={`rounded-xl border ${border_subtle} ${bg_card} overflow-hidden`}>
						<div
							className={`px-6 py-4 border-b ${border_subtle} flex items-center justify-between`}
						>
							<h3 className={`font-semibold text-base tracking-tight ${text_heading}`}>
								Training Jobs
							</h3>
							<div
								className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${bg_subtle} ${text_muted}`}
							>
								<BarChart3 size={14} /> {runs.length} total
							</div>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm text-left">
								<thead
									className={`text-xs uppercase ${bg_subtle} ${text_muted} border-b ${border_subtle}`}
								>
									<tr>
										<th className="px-6 py-4 font-medium">Name</th>
										<th className="px-6 py-4 font-medium">Model / Dataset</th>
										<th className="px-6 py-4 font-medium">Progress</th>
										<th className="px-6 py-4 font-medium">Accuracy</th>
										<th className="px-6 py-4 font-medium">Loss</th>
										<th className="px-6 py-4 font-medium">Duration</th>
										<th className="px-6 py-4 font-medium">Status</th>
										<th className="px-6 py-4 font-medium"></th>
									</tr>
								</thead>
								<tbody className="divide-y divide-zinc-800/20">
									{runs.map((run) => (
										<Fragment key={run.id}>
											{table_row({
												run,
												is_dark_mode,
												bg_subtle,
												text_heading,
												text_muted,
												deleting_id,
												on_delete: handle_delete
											})}
											{(run.status === 'Running' || run.status === 'Completed') &&
												training_chart(run, is_dark_mode)}
										</Fragment>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>

			{new_training_dialog({
				is_dark_mode,
				datasets,
				open: is_new_dialog_open,
				on_close: () => set_is_new_dialog_open(false),
				on_create: handle_create,
				is_creating
			})}
		</div>
	)
}
