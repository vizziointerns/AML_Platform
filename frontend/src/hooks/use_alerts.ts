import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { use_auth } from '../contexts/auth_context'
import { fetch_training_runs, type TrainingRun } from '../api/training'

export interface Alert {
	id: string
	severity: 'danger' | 'warning' | 'info'
	title: string
	description: string
}

interface UseAlertsResult {
	alerts: Alert[]
	is_loading: boolean
}

function check_failures(runs: TrainingRun[]): Alert | undefined {
	const failed = runs.filter((r) => r.status === 'Failed')
	if (failed.length === 0) return undefined

	const names = failed.map((r) => `"${r.name}"`)
	const first_err = failed[0]?.error_message
	return {
		id: 'training-failures',
		severity: 'danger',
		title:
			failed.length === 1 ? `Training ${names[0]} failed` : `${failed.length} training runs failed`,
		description: first_err
			? first_err.length > 120
				? first_err.slice(0, 120) + '...'
				: first_err
			: 'No error details available'
	}
}

function check_running(runs: TrainingRun[]): Alert | undefined {
	const running = runs.filter((r) => r.status === 'Running')
	if (running.length === 0) return undefined

	if (running.length === 1) {
		const r = running[0]!
		return {
			id: 'training-running',
			severity: 'info',
			title: `Training "${r.name}" is running`,
			description: `Epoch ${r.current_epoch ?? 0}/${r.epochs ?? '?'}`
		}
	}

	return {
		id: 'training-running',
		severity: 'info',
		title: `${running.length} training jobs running`,
		description: running
			.map((r) => `${r.name} (${r.current_epoch ?? 0}/${r.epochs ?? '?'})`)
			.join(', ')
	}
}

function check_low_accuracy(runs: TrainingRun[]): Alert | undefined {
	const completed = runs.filter(
		(r) => r.status === 'Completed' && r.accuracy !== undefined && r.accuracy < 0.5
	)
	if (completed.length === 0) return undefined

	const worst = completed.reduce((a, b) => (a.accuracy! < b.accuracy! ? a : b))
	return {
		id: 'low-accuracy',
		severity: 'warning',
		title:
			completed.length === 1
				? `Low accuracy (${(worst.accuracy! * 100).toFixed(0)}%) in "${worst.name}"`
				: `${completed.length} models have low accuracy`,
		description:
			completed.length === 1
				? 'Accuracy is below 50%. Consider adjusting model parameters or adding more data.'
				: `Worst: "${worst.name}" at ${(worst.accuracy! * 100).toFixed(0)}%`
	}
}

function check_empty_datasets(datasets: Array<{ id: string; name: string }>): Alert | undefined {
	if (datasets.length === 0) return undefined

	if (datasets.length === 1) {
		return {
			id: 'empty-datasets',
			severity: 'warning',
			title: `Dataset "${datasets[0]!.name}" has no images`,
			description: 'Upload images to get started with this dataset.'
		}
	}

	const names = datasets.map((d) => `"${d.name}"`).join(', ')
	return {
		id: 'empty-datasets',
		severity: 'warning',
		title: `${datasets.length} datasets have no images`,
		description: names
	}
}

export function use_alerts(): UseAlertsResult {
	const { user } = use_auth()
	const [alerts, set_alerts] = useState<Alert[]>([])
	const [is_loading, set_is_loading] = useState(true)
	const [refresh_key, set_refresh_key] = useState(0)

	const refresh = useCallback(() => {
		set_refresh_key((k) => k + 1)
	}, [])

	useEffect(() => {
		window.addEventListener('upload-complete', refresh)
		window.addEventListener('datasets-changed', refresh)
		return () => {
			window.removeEventListener('upload-complete', refresh)
			window.removeEventListener('datasets-changed', refresh)
		}
	}, [refresh])

	useEffect(() => {
		if (!user) {
			set_alerts([])
			set_is_loading(false)
			return
		}

		let is_cancelled = false

		;(async () => {
			set_is_loading(true)

			const { data: projects } = await supabase.from('projects').select('id').eq('user_id', user.id)

			if (is_cancelled) return

			const project_ids = (projects ?? []).map((p) => p.id)
			if (project_ids.length === 0) {
				set_alerts([])
				set_is_loading(false)
				return
			}

			const [training_results, { data: datasets_data }] = await Promise.all([
				Promise.allSettled(project_ids.slice(0, 5).map((pid) => fetch_training_runs(pid))),
				supabase.from('datasets').select('id, name, image_count').in('project_id', project_ids)
			])

			if (is_cancelled) return

			const all_runs = training_results
				.filter((r) => r.status === 'fulfilled')
				.flatMap(
					(r) =>
						(r as PromiseFulfilledResult<Awaited<ReturnType<typeof fetch_training_runs>>>).value
				)

			const empty_datasets = (datasets_data ?? []).filter(
				(d) => !d.image_count || d.image_count === 0
			)

			const result: Alert[] = []
			for (const check of [
				() => check_failures(all_runs),
				() => check_low_accuracy(all_runs),
				() => check_empty_datasets(empty_datasets),
				() => check_running(all_runs)
			]) {
				const alert = check()
				if (alert) result.push(alert)
				if (result.length >= 4) break
			}

			set_alerts(result)
			set_is_loading(false)
		})()

		return () => {
			is_cancelled = true
		}
	}, [user, refresh_key])

	return { alerts, is_loading }
}
