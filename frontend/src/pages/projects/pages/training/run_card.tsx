import { Fragment } from 'react'
import { Square, Download, Clock, Activity, Trash2, BarChart3 } from 'lucide-react'
import { download_weights_url, type TrainingRun } from '../../../../api/training'

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

function progress_bar_color(status: string): string {
	if (status === 'Completed') return 'bg-emerald-500'
	if (status === 'Failed') return 'bg-red-500'
	if (status === 'Running') return 'bg-blue-500'
	return 'bg-zinc-500'
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

function table_row({
	run,
	is_dark_mode,
	text_heading,
	text_muted,
	deleting_id,
	on_delete,
	on_error
}: {
	run: TrainingRun
	is_dark_mode: boolean
	text_heading: string
	text_muted: string
	deleting_id: number | undefined
	on_delete: (id: number) => void
	on_error: (msg: string) => void
}) {
	const pct = run.epochs > 0 ? Math.round((run.current_epoch / run.epochs) * 100) : 0
	const bar_color = progress_bar_color(run.status)
	const progress_bg = is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'
	return (
		<>
			<tr className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors`}>
				<td className="px-6 py-4">
					<div className={`font-medium ${text_heading}`}>{run.name}</div>
				</td>
				<td className="px-6 py-4">
					<div className={text_heading}>{run.task_type || '—'}</div>
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
					<div className="flex items-center gap-1">
						{run.status === 'Completed' && (
							<button
								onClick={async () => {
									try {
										const url = await download_weights_url(run.project_id, run.id)
										const a = document.createElement('a')
										a.href = url
										a.download = `model_${run.id}_best.pt`
										document.body.appendChild(a)
										a.click()
										document.body.removeChild(a)
									} catch (err) {
										on_error(err instanceof Error ? err.message : 'Download failed')
									}
								}}
								className="p-1.5 rounded-md text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
								title="Download model weights"
							>
								<Download size={14} />
							</button>
						)}
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
					</div>
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

export function training_runs_table({
	runs,
	is_dark_mode,
	deleting_id,
	handle_delete,
	handle_error
}: {
	runs: TrainingRun[]
	is_dark_mode: boolean
	deleting_id: number | undefined
	handle_delete: (id: number) => void
	handle_error: (msg: string) => void
}) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	return (
		<div className={`rounded-xl border ${border_subtle} ${bg_card} overflow-hidden`}>
			<div className={`px-6 py-4 border-b ${border_subtle} flex items-center justify-between`}>
				<h3 className={`font-semibold text-base tracking-tight ${text_heading}`}>Training Jobs</h3>
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
									text_heading,
									text_muted,
									deleting_id,
									on_delete: handle_delete,
									on_error: handle_error
								})}
								{(run.status === 'Running' || run.status === 'Completed') &&
									training_chart(run, is_dark_mode)}
							</Fragment>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
