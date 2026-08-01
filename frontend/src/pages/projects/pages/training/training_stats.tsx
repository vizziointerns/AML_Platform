import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Cpu, Check, ChevronDown } from 'lucide-react'
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

function selector_label({
	has_models,
	selected_run,
	show_all
}: {
	has_models: boolean
	selected_run: TrainingRun | undefined
	show_all: boolean
}): string {
	if (!has_models) return 'No models'
	if (selected_run) return `${selected_run.name} — ${selected_run.status}`
	return show_all ? 'All models (aggregate)' : 'Select model'
}

function render_selector_menu({
	is_open,
	pos,
	has_models,
	runs,
	selected_id,
	on_select,
	show_all,
	menu_ref,
	text_heading,
	hover_bg,
	border_subtle,
	bg_card,
	set_is_open
}: {
	is_open: boolean
	pos: { top: number; right: number } | undefined
	has_models: boolean
	runs: TrainingRun[]
	selected_id: number | undefined
	on_select: (id: number | undefined) => void
	show_all: boolean
	menu_ref: { current: HTMLDivElement | null }
	text_heading: string
	hover_bg: string
	border_subtle: string
	bg_card: string
	set_is_open: (v: boolean) => void
}) {
	if (!is_open || !pos || !has_models) return undefined
	return createPortal(
		<div
			ref={menu_ref}
			style={{ position: 'fixed', top: pos.top, right: pos.right }}
			className={`min-w-[220px] max-w-[320px] rounded-xl border ${border_subtle} ${bg_card} shadow-lg z-50 py-1`}
		>
			{show_all && (
				<button
					onClick={() => {
						on_select(undefined)
						set_is_open(false)
					}}
					className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${text_heading} ${hover_bg}`}
				>
					<span className="w-4 shrink-0">
						{selected_id === undefined && <Check size={14} className="text-blue-500" />}
					</span>
					<span className="truncate">All models (aggregate)</span>
				</button>
			)}
			{runs.map((r) => (
				<button
					key={r.id}
					onClick={() => {
						on_select(r.id)
						set_is_open(false)
					}}
					className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${text_heading} ${hover_bg}`}
				>
					<span className="w-4 shrink-0">
						{r.id === selected_id && <Check size={14} className="text-blue-500" />}
					</span>
					<span className="truncate">
						{r.name} — {r.status}
						{r.accuracy !== undefined ? ` (${(r.accuracy * 100).toFixed(1)}%)` : ''}
					</span>
				</button>
			))}
		</div>,
		document.body
	)
}

export function model_selector({
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
	const [is_open, set_is_open] = useState(false)
	const [pos, set_pos] = useState<{ top: number; right: number } | undefined>(undefined)
	const btn_ref = useRef<HTMLButtonElement>(undefined!)
	const menu_ref = useRef<HTMLDivElement>(undefined!)

	useEffect(() => {
		if (!is_open) return
		const handler = (e: MouseEvent) => {
			const t = e.target as Node
			if (!btn_ref.current?.contains(t) && !menu_ref.current?.contains(t)) set_is_open(false)
		}
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [is_open])

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
	const has_models = runs.length > 0
	const selected_run = runs.find((r) => r.id === selected_id)
	const label = selector_label({ has_models, selected_run, show_all })
	return (
		<>
			<button
				ref={btn_ref}
				disabled={!has_models}
				onClick={() => {
					const will_open = !is_open
					if (will_open) {
						const r = btn_ref.current.getBoundingClientRect()
						set_pos({ top: r.bottom + 4, right: window.innerWidth - r.right })
					}
					set_is_open(will_open)
				}}
				className={`flex items-center gap-2 px-3 py-2 rounded-xl ${bg_card} text-sm transition-colors ${
					has_models
						? 'cursor-pointer hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'
						: 'cursor-not-allowed opacity-60'
				}`}
				title="Select model to view metrics"
			>
				<Cpu size={16} className={`shrink-0 ${text_muted}`} />
				<span className={`max-w-[200px] truncate ${text_heading}`}>{label}</span>
				<ChevronDown
					size={14}
					className={`shrink-0 transition-transform ${text_muted} ${is_open ? 'rotate-180' : ''}`}
				/>
			</button>
			{render_selector_menu({
				is_open,
				pos,
				has_models,
				runs,
				selected_id,
				on_select,
				show_all,
				menu_ref,
				text_heading,
				hover_bg,
				border_subtle,
				bg_card,
				set_is_open
			})}
		</>
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
