import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Activity, Download } from 'lucide-react'
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer
} from 'recharts'
import {
	fetch_training_runs,
	download_weights_url,
	type TrainingRun
} from '../../../../api/training'
import { stat_card, render_model_selector } from './training_stats'
import { parse_run_metrics, status_tag } from './run_card'

function dashboard_theme(is_dark_mode: boolean) {
	return {
		text_muted: is_dark_mode ? 'text-zinc-400' : 'text-zinc-500',
		text_heading: is_dark_mode ? 'text-zinc-100' : 'text-zinc-900',
		border_subtle: is_dark_mode ? 'border-zinc-800' : 'border-zinc-200',
		bg_card: is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	}
}

type DashboardTheme = ReturnType<typeof dashboard_theme>

function detail_row({
	label,
	value,
	t
}: {
	label: string
	value: string | undefined
	t: DashboardTheme
}) {
	return (
		<div className="flex justify-between items-center gap-4 py-2.5">
			<span className={`text-sm ${t.text_muted}`}>{label}</span>
			<span className={`text-sm font-medium text-right break-all ${t.text_heading}`}>
				{value || '—'}
			</span>
		</div>
	)
}

function metric_curve({
	title,
	data,
	color,
	is_dark_mode,
	format_value
}: {
	title: string
	data: { epoch: number; value: number }[]
	color: string
	is_dark_mode: boolean
	format_value: (v: number) => string
}) {
	const t = dashboard_theme(is_dark_mode)
	return (
		<div className={`rounded-xl border ${t.border_subtle} ${t.bg_card} p-6`}>
			<h3 className={`font-semibold text-base tracking-tight mb-4 ${t.text_heading}`}>{title}</h3>
			{data.length < 2 ? (
				<div className={`text-sm ${t.text_muted} py-12 text-center`}>
					Not enough data points yet.
				</div>
			) : (
				<div className="h-[260px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
							<CartesianGrid
								strokeDasharray="3 3"
								vertical={false}
								stroke={is_dark_mode ? '#27272a' : '#e4e4e7'}
							/>
							<XAxis
								dataKey="epoch"
								axisLine={false}
								tickLine={false}
								tick={{ fill: is_dark_mode ? '#a1a1aa' : '#71717a', fontSize: 12 }}
								dy={10}
							/>
							<YAxis
								domain={[0, 'auto']}
								axisLine={false}
								tickLine={false}
								tick={{ fill: is_dark_mode ? '#a1a1aa' : '#71717a', fontSize: 12 }}
								tickFormatter={(v: number) => format_value(Number(v))}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: is_dark_mode ? '#18181b' : '#ffffff',
									borderColor: is_dark_mode ? '#27272a' : '#e4e4e7',
									borderRadius: '8px'
								}}
								itemStyle={{ color: is_dark_mode ? '#f4f4f5' : '#18181b' }}
								labelFormatter={(label) => `Epoch ${label}`}
								formatter={(value) => [format_value(Number(value)), title]}
							/>
							<Line
								type="monotone"
								dataKey="value"
								stroke={color}
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 4 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			)}
		</div>
	)
}

function dashboard_header({
	runs,
	selected_run,
	is_dark_mode,
	on_back,
	on_select_model,
	on_download
}: {
	runs: TrainingRun[]
	selected_run: TrainingRun | undefined
	is_dark_mode: boolean
	on_back: () => void
	on_select_model: (id: number) => void
	on_download: () => void
}) {
	const t = dashboard_theme(is_dark_mode)
	return (
		<div className="page-header">
			<div className="flex items-center gap-3">
				<button
					onClick={on_back}
					className={`p-2 rounded-lg border ${t.border_subtle} ${t.bg_card} text-zinc-500 hover:text-blue-500 transition-colors`}
					title="Back to training"
				>
					<ArrowLeft size={18} />
				</button>
				<div>
					<h1 className={`text-2xl font-semibold tracking-tight ${t.text_heading}`}>
						{selected_run ? selected_run.name : 'Model Dashboard'}
					</h1>
					<p className={`text-sm mt-1 ${t.text_muted}`}>
						{selected_run
							? `Training run #${selected_run.id} · ${selected_run.task_type}`
							: 'Select a model to view its metrics'}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				{render_model_selector({
					runs,
					selected_id: selected_run?.id,
					on_select: (id) => {
						if (id) on_select_model(id)
					},
					is_dark_mode,
					show_all: false
				})}
				{selected_run?.status === 'Completed' && (
					<button onClick={on_download} className="btn-primary inline-flex">
						<Download size={16} /> Weights
					</button>
				)}
			</div>
		</div>
	)
}

function dashboard_stat_cards(selected_run: TrainingRun, is_dark_mode: boolean) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{stat_card({
				label: 'Accuracy',
				value:
					selected_run.accuracy !== undefined
						? `${(selected_run.accuracy * 100).toFixed(1)}%`
						: '—',
				is_dark_mode
			})}
			{stat_card({
				label: 'Loss',
				value: selected_run.loss !== undefined ? selected_run.loss.toFixed(2) : '—',
				is_dark_mode
			})}
			{stat_card({
				label: 'Progress',
				value: `${selected_run.current_epoch}/${selected_run.epochs}`,
				is_dark_mode
			})}
			{stat_card({
				label: 'Duration',
				value: selected_run.duration ?? '—',
				is_dark_mode
			})}
		</div>
	)
}

function dashboard_detail_panel(selected_run: TrainingRun, is_dark_mode: boolean) {
	const t = dashboard_theme(is_dark_mode)
	return (
		<div className={`rounded-xl border ${t.border_subtle} ${t.bg_card} p-6 h-fit`}>
			<h3 className={`font-semibold text-base tracking-tight mb-2 ${t.text_heading}`}>Details</h3>
			<div className="flex items-center mb-4">{status_tag(selected_run.status)}</div>
			<div className="divide-y divide-zinc-800/20">
				{detail_row({ label: 'Model ID', value: String(selected_run.id), t })}
				{detail_row({ label: 'Task Type', value: selected_run.task_type, t })}
				{detail_row({ label: 'Dataset', value: selected_run.dataset_id, t })}
				{detail_row({
					label: 'Epochs',
					value: `${selected_run.current_epoch} / ${selected_run.epochs}`,
					t
				})}
				{detail_row({ label: 'Created', value: selected_run.created_at, t })}
				{detail_row({ label: 'Started', value: selected_run.started_at, t })}
				{detail_row({ label: 'Completed', value: selected_run.completed_at, t })}
				{detail_row({ label: 'Duration', value: selected_run.duration, t })}
			</div>
			{selected_run.status === 'Failed' && selected_run.error_message && (
				<div
					className={`mt-4 text-xs text-red-500 ${
						is_dark_mode ? 'bg-red-500/5' : 'bg-red-50'
					} rounded-md p-3 font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto`}
				>
					{selected_run.error_message}
				</div>
			)}
		</div>
	)
}

function render_metrics_view(selected_run: TrainingRun, is_dark_mode: boolean) {
	const metrics = parse_run_metrics(selected_run)
	const accuracy_data = metrics
		.filter((m) => m.accuracy !== undefined)
		.map((m) => ({ epoch: m.epoch, value: m.accuracy! }))
	const loss_data = metrics
		.filter((m) => m.loss !== undefined)
		.map((m) => ({ epoch: m.epoch, value: m.loss! }))

	return (
		<>
			{dashboard_stat_cards(selected_run, is_dark_mode)}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
				<div className="lg:col-span-2 space-y-6">
					{metric_curve({
						title: 'Accuracy (mAP50 / IoU)',
						data: accuracy_data,
						color: '#22c55e',
						is_dark_mode,
						format_value: (v) => (v * 100).toFixed(1) + '%'
					})}
					{metric_curve({
						title: 'Loss',
						data: loss_data,
						color: '#ef4444',
						is_dark_mode,
						format_value: (v) => v.toFixed(2)
					})}
				</div>
				<div>{dashboard_detail_panel(selected_run, is_dark_mode)}</div>
			</div>
		</>
	)
}

function dashboard_state_view(kind: 'loading' | 'empty' | 'missing', t: DashboardTheme) {
	if (kind === 'loading') {
		return (
			<div className={`flex items-center justify-center py-20 ${t.text_muted}`}>
				<Activity size={20} className="animate-spin mr-2" /> Loading model metrics...
			</div>
		)
	}
	if (kind === 'empty') {
		return (
			<div className={`rounded-xl border ${t.border_subtle} ${t.bg_card} p-12 text-center`}>
				<div className={`text-lg font-medium mb-2 ${t.text_heading}`}>No training runs yet</div>
				<p className={`text-sm ${t.text_muted}`}>Start a training run to see model metrics here.</p>
			</div>
		)
	}
	return (
		<div className={`rounded-xl border ${t.border_subtle} ${t.bg_card} p-12 text-center`}>
			<div className={`text-lg font-medium mb-2 ${t.text_heading}`}>Model not found</div>
			<p className={`text-sm ${t.text_muted}`}>The selected model could not be found.</p>
		</div>
	)
}

export default function model_dashboard({
	project_id,
	run_id,
	is_dark_mode
}: {
	project_id: string
	run_id: string | undefined
	is_dark_mode: boolean
}) {
	const navigate = useNavigate()
	const [runs, set_runs] = useState<TrainingRun[]>([])
	const [is_loading, set_is_loading] = useState(true)
	const [error, set_error] = useState<string | undefined>(undefined)
	const t = dashboard_theme(is_dark_mode)

	const load_runs = useCallback(async () => {
		try {
			const data = await fetch_training_runs(project_id)
			set_runs(data)
			set_error(undefined)
		} catch (err) {
			set_error(err instanceof Error ? err.message : 'Failed to load training runs')
		} finally {
			set_is_loading(false)
		}
	}, [project_id])

	useEffect(() => {
		load_runs()
		const interval = setInterval(() => load_runs(), 3000)
		return () => clearInterval(interval)
	}, [load_runs])

	const selected_run = runs.find((r) => r.id === Number(run_id)) ?? runs[0]

	const handle_download = async () => {
		if (!selected_run || selected_run.status !== 'Completed') return
		try {
			const url = await download_weights_url(selected_run.project_id, selected_run.id)
			const a = document.createElement('a')
			a.href = url
			a.download = `model_${selected_run.id}_best.pt`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
		} catch (err) {
			set_error(err instanceof Error ? err.message : 'Download failed')
		}
	}

	const body = is_loading
		? dashboard_state_view('loading', t)
		: runs.length === 0
			? dashboard_state_view('empty', t)
			: !selected_run
				? dashboard_state_view('missing', t)
				: render_metrics_view(selected_run, is_dark_mode)

	return (
		<div className="page-layout">
			<div className="page-content">
				{dashboard_header({
					runs,
					selected_run,
					is_dark_mode,
					on_back: () => navigate(`/projects/${project_id}/training`),
					on_select_model: (id) => navigate(`/projects/${project_id}/training/${id}`),
					on_download: handle_download
				})}
				{error && (
					<div
						className={`px-4 py-3 rounded-lg text-sm text-red-500 ${
							is_dark_mode ? 'bg-red-500/10' : 'bg-red-50'
						}`}
					>
						{error}
					</div>
				)}
				{body}
			</div>
		</div>
	)
}
