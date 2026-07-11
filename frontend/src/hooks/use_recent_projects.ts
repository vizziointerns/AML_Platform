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

interface BulkStat {
	project_id: string
	total_images: number
	annotation_progress: number
}

async function enrich_project_counts(
	project_ids: string[]
): Promise<Record<string, { total: number; annotated_pct: number }>> {
	const counts: Record<string, { total: number; annotated_pct: number }> = {}
	if (project_ids.length === 0) return counts

	const { data: bulk_stats } = await supabase.rpc('get_bulk_project_stats')
	if (!Array.isArray(bulk_stats)) return counts

	for (const stat of bulk_stats as BulkStat[]) {
		if (project_ids.includes(stat.project_id)) {
			counts[stat.project_id] = {
				total: stat.total_images,
				annotated_pct: stat.annotation_progress
			}
		}
	}

	return counts
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
				const c = counts[proj.id]
				proj.datasetCount = c?.total ?? 0
				proj.annotationProgress = c?.annotated_pct ?? 0
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
