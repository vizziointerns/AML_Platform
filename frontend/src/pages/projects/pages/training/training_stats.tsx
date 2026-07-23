import { Plus } from 'lucide-react'
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
