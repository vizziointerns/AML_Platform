import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { use_auth } from '../contexts/auth_context'
import { fetch_training_runs, type TrainingRun } from '../api/training'

export interface ActivityItem {
	id: string
	type: string
	description: string
	timestamp: string
	relative_time: string
}

interface UseActivityFeedResult {
	items: ActivityItem[]
	is_loading: boolean
}

interface FetchResult {
	datasets: Array<{ id: string; name: string; project_id: string; created_at: string }>
	images: Array<{ dataset_id: string; uploaded_at: string }>
	runs: Awaited<ReturnType<typeof fetch_training_runs>>
}

function time_ago(date_str: string): string {
	const diff = Date.now() - new Date(date_str).getTime()
	const mins = Math.floor(diff / 60000)
	if (mins < 1) return 'just now'
	if (mins < 60) return `${mins}m ago`
	const hrs = Math.floor(mins / 60)
	if (hrs < 24) return `${hrs}h ago`
	const days = Math.floor(hrs / 24)
	if (days < 30) return `${days}d ago`
	return `${Math.floor(days / 30)}mo ago`
}

function training_action_label(status: string): string {
	if (status === 'Completed') return 'completed'
	if (status === 'Failed') return 'failed'
	if (status === 'Running') return 'started'
	return 'created'
}

function group_uploads(
	images: Array<{ dataset_id: string; uploaded_at: string }>
): Record<string, { count: number; latest: string }> {
	const groups: Record<string, { count: number; latest: string }> = {}
	for (const img of images) {
		const entry = groups[img.dataset_id]
		if (!entry) {
			groups[img.dataset_id] = { count: 1, latest: img.uploaded_at }
		} else {
			entry.count++
			entry.latest = img.uploaded_at > entry.latest ? img.uploaded_at : entry.latest
		}
	}
	return groups
}

function build_items(
	datasets: Array<{ id: string; name: string; created_at: string }>,
	images: Array<{ dataset_id: string; uploaded_at: string }>,
	runs: TrainingRun[]
): ActivityItem[] {
	const items: ActivityItem[] = []

	for (const ds of datasets) {
		items.push({
			id: `ds-${ds.id}`,
			type: 'dataset_created',
			description: `You created dataset "${ds.name}"`,
			timestamp: ds.created_at,
			relative_time: time_ago(ds.created_at)
		})
	}

	const name_map = new Map(datasets.map((d) => [d.id, d.name]))
	const uploads = group_uploads(images)
	for (const [ds_id, info] of Object.entries(uploads)) {
		const ds_name = name_map.get(ds_id) ?? 'Unknown dataset'
		items.push({
			id: `up-${ds_id}`,
			type: 'images_uploaded',
			description: `You uploaded ${info.count} ${info.count === 1 ? 'image' : 'images'} to "${ds_name}"`,
			timestamp: info.latest,
			relative_time: time_ago(info.latest)
		})
	}

	for (const run of runs) {
		const ts = run.completed_at ?? run.started_at ?? run.created_at
		const label = training_action_label(run.status)
		items.push({
			id: `tr-${String(run.id)}`,
			type: `training_${label}`,
			description: `Training "${run.name}" ${label}`,
			timestamp: ts,
			relative_time: time_ago(ts)
		})
	}

	return items
}

async function fetch_activity_data(user_id: string): Promise<FetchResult | undefined> {
	const { data: projects } = await supabase.from('projects').select('id').eq('user_id', user_id)

	const project_ids = (projects ?? []).map((p) => p.id)
	if (project_ids.length === 0) return undefined

	const { data: datasets_data } = await supabase
		.from('datasets')
		.select('id, name, project_id, created_at')
		.in('project_id', project_ids)
		.order('created_at', { ascending: false })
		.limit(10)

	const datasets = datasets_data ?? []
	const dataset_ids = datasets.map((d) => d.id)
	const { data: recent_images } =
		dataset_ids.length > 0
			? await supabase
					.from('dataset_images')
					.select('dataset_id, uploaded_at')
					.in('dataset_id', dataset_ids)
					.order('uploaded_at', { ascending: false })
					.limit(50)
			: { data: [] }

	const recent_project_ids = project_ids.slice(0, 5)
	const results = await Promise.allSettled(
		recent_project_ids.map((pid) => fetch_training_runs(pid))
	)
	const runs = results
		.filter((r) => r.status === 'fulfilled')
		.flatMap(
			(r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof fetch_training_runs>>>).value
		)

	return { datasets, images: recent_images ?? [], runs }
}

export function use_activity_feed(): UseActivityFeedResult {
	const { user } = use_auth()
	const [items, set_items] = useState<ActivityItem[]>([])
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
			set_items([])
			set_is_loading(false)
			return
		}

		let is_cancelled = false

		;(async () => {
			set_is_loading(true)
			const result = await fetch_activity_data(user.id)
			if (is_cancelled) return

			if (!result) {
				set_items([])
				set_is_loading(false)
				return
			}

			const all_items = build_items(result.datasets, result.images, result.runs)
			all_items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
			set_items(all_items.slice(0, 5))
			set_is_loading(false)
		})()

		return () => {
			is_cancelled = true
		}
	}, [user, refresh_key])

	return { items, is_loading }
}
