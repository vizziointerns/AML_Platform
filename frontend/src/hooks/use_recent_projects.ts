import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { use_auth } from '../contexts/auth_context'
import type { Project, ProjectType, ProjectStatus } from '../store/projectStore'

export interface UseRecentProjectsResult {
	projects: Project[]
	is_loading: boolean
	error: string | undefined
}

interface DbProject {
	id: string
	name: string
	description: string
	type: string
	status: string
	dataset_count: number
	annotation_progress: number
	members: string[]
	last_updated: number
	is_pinned: boolean
	is_favorite: boolean
	thumbnail: string
}

function map_project(db: DbProject): Project {
	return {
		id: db.id,
		name: db.name,
		description: db.description,
		type: db.type as ProjectType,
		status: db.status as ProjectStatus,
		datasetCount: db.dataset_count,
		annotationProgress: db.annotation_progress,
		members: db.members ?? [],
		lastUpdated: db.last_updated,
		isPinned: db.is_pinned,
		isFavorite: db.is_favorite,
		thumbnail: db.thumbnail ?? ''
	}
}

export function use_recent_projects(limit = 4): UseRecentProjectsResult {
	const { user } = use_auth()
	const [projects, set_projects] = useState<Project[]>([])
	const [is_loading, set_is_loading] = useState(true)
	const [error, set_error] = useState<string | undefined>()

	useEffect(() => {
		if (!user) {
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

			set_projects((data ?? []).map(map_project))
			set_is_loading(false)
		})()

		return () => {
			is_cancelled = true
		}
	}, [user, limit])

	return { projects, is_loading, error }
}
