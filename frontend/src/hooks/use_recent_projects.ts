import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { use_auth } from '../contexts/auth_context'
import { map_project } from '../utils/project_mapping'
import type { Project } from '../store/projectStore'

export interface UseRecentProjectsResult {
	projects: Project[]
	is_loading: boolean
	error: string | undefined
}

interface EnrichedCounts {
	image_counts: Record<string, number>
	annotated_counts: Record<string, number>
}

async function enrich_project_counts(project_ids: string[]): Promise<EnrichedCounts> {
	const image_counts: Record<string, number> = {}
	const annotated_counts: Record<string, number> = {}

	if (project_ids.length === 0) return { image_counts, annotated_counts }

	const { data: datasets } = await supabase
		.from('datasets')
		.select('id, project_id')
		.in('project_id', project_ids)

	const ds_to_project = new Map<string, string>()
	for (const ds of datasets ?? []) {
		ds_to_project.set(ds.id, ds.project_id)
	}

	const ds_ids = (datasets ?? []).map((d) => d.id)
	if (ds_ids.length === 0) return { image_counts, annotated_counts }

	const { data: images } = await supabase
		.from('dataset_images')
		.select('dataset_id, class_labels')
		.in('dataset_id', ds_ids)

	for (const img of images ?? []) {
		const pid = ds_to_project.get(img.dataset_id)
		if (!pid) continue
		image_counts[pid] = (image_counts[pid] ?? 0) + 1
		if (img.class_labels && img.class_labels.length > 0) {
			annotated_counts[pid] = (annotated_counts[pid] ?? 0) + 1
		}
	}

	return { image_counts, annotated_counts }
}

export function use_recent_projects(limit = 4): UseRecentProjectsResult {
	const { user } = use_auth()
	const [projects, set_projects] = useState<Project[]>([])
	const [is_loading, set_is_loading] = useState(true)
	const [error, set_error] = useState<string | undefined>()

	useEffect(() => {
		if (!user) {
			set_projects([])
			set_error(undefined)
			set_is_loading(false)
			return
		}

		let is_cancelled = false
		set_is_loading(true)
		set_error(undefined)
		;(async () => {
			const { data, error: err } = await supabase
				.from('projects')
				.select('*')
				.eq('user_id', user.id)
				.order('last_updated', { ascending: false })
				.limit(limit)

			if (is_cancelled) return

			if (err) {
				if (
					err.message?.includes('does not exist') ||
					err.message?.includes('Could not find the table')
				) {
					set_projects([])
				} else {
					set_error(err.message)
				}
				set_is_loading(false)
				return
			}

			const mapped = (data ?? []).map(map_project)
			const counts = await enrich_project_counts(mapped.map((p) => p.id))

			for (const proj of mapped) {
				proj.datasetCount = counts.image_counts[proj.id] ?? 0
				const total = proj.datasetCount
				const annotated = counts.annotated_counts[proj.id] ?? 0
				proj.annotationProgress = total > 0 ? Math.round((annotated / total) * 100) : 0
			}

			set_projects(mapped)
			set_is_loading(false)
		})()

		return () => {
			is_cancelled = true
		}
	}, [user, limit])

	return { projects, is_loading, error }
}
