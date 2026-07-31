import { Plus, Cpu } from 'lucide-react'
import type { TrainingRun } from '../../../../api/training'

export function stat_card({
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

function duration_to_hours(duration: string | undefined): number {
	if (!duration) return 0
	const parts = duration.match(/(\d+)h\s*(\d+)?m?/)
	if (!parts) return 0
	return parseInt(parts[1] ?? '0', 10) + parseInt(parts[2] ?? '0', 10) / 60
}

export function compute_stats(runs: TrainingRun[]) {
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
	const total_duration_hours = runs.reduce((sum, r) => sum + duration_to_hours(r.duration), 0)
	return {
		active_jobs: active,
		avg_accuracy: completed.length ? (avg_accuracy * 100).toFixed(1) + '%' : '—',
		avg_loss: completed.length ? avg_loss.toFixed(2) : '—',
		total_hours: total_duration_hours.toFixed(1)
	}
}

export function compute_selected_stats(selected_run: TrainingRun | undefined, runs: TrainingRun[]) {
	if (!selected_run) return compute_stats(runs)
	return {
		active_jobs: selected_run.status === 'Running' ? 1 : 0,
		avg_accuracy:
			selected_run.accuracy !== undefined ? (selected_run.accuracy * 100).toFixed(1) + '%' : '—',
		avg_loss: selected_run.loss !== undefined ? selected_run.loss.toFixed(2) : '—',
		total_hours: duration_to_hours(selected_run.duration).toFixed(1)
	}
}

export function render_model_selector({
	runs,
	selected_id,
	on_select,
	is_dark_mode,
	show_all = true
}: {
	runs: TrainingRun[]
	selected_id: number | undefined
	on_select: (id: number | undefined) => void
	is_dark_mode: boolean
	show_all?: boolean
}) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	return (
		<div
			className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${border_subtle} ${bg_card}`}
		>
			<Cpu size={16} className={`shrink-0 ${text_muted}`} />
			<select
				value={selected_id ?? ''}
				onChange={(e) => on_select(e.target.value ? Number(e.target.value) : undefined)}
				className={`bg-transparent text-sm outline-none cursor-pointer max-w-[240px] truncate ${text_heading}`}
				title="Select model to view metrics"
			>
				{show_all && <option value="">All models (aggregate)</option>}
				{runs.map((r) => (
					<option key={r.id} value={r.id}>
						{r.name} — {r.status}
						{r.accuracy !== undefined ? ` (${(r.accuracy * 100).toFixed(1)}%)` : ''}
					</option>
				))}
			</select>
		</div>
	)
}

export function empty_runs_state({
	set_is_new_dialog_open,
	is_dark_mode
}: {
	set_is_new_dialog_open: (val: boolean) => void
	is_dark_mode: boolean
}) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	return (
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
	)
}
