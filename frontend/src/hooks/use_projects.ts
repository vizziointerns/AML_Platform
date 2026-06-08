import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { use_auth } from '../contexts/auth_context'
import { use_project_store } from '../store/projectStore'
import type { Project, ProjectType, ProjectStatus } from '../store/projectStore'

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

export function use_projects() {
	const { user } = use_auth()
	const set_projects = use_project_store((s) => s.setProjects)
	const [is_loading, set_is_loading] = useState(true)
	const [error, set_error] = useState<string | undefined>()

	const fetch_projects = useCallback(async () => {
		if (!user) {
			set_projects([])
			set_is_loading(false)
			return
		}

		set_is_loading(true)
		set_error(undefined)

		const { data, error: err } = await supabase
			.from('projects')
			.select('*')
			.eq('user_id', user.id)
			.order('last_updated', { ascending: false })

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
	}, [user, set_projects])

	useEffect(() => {
		fetch_projects()
	}, [fetch_projects])

	return { is_loading, error, refetch: fetch_projects }
}
