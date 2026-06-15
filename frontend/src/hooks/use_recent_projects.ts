import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { use_auth } from '../contexts/auth_context'
import { use_project_store } from '../store/projectStore'
import { map_project } from '../utils/project_mapping'
import type { Project } from '../store/projectStore'

export interface UseRecentProjectsResult {
	projects: Project[]
	is_loading: boolean
	error: string | undefined
}

export function use_recent_projects(limit = 4): UseRecentProjectsResult {
	const { user } = use_auth()
	const [projects, set_projects] = useState<Project[]>([])
	const [is_loading, set_is_loading] = useState(true)
	const [error, set_error] = useState<string | undefined>()
	const set_store_projects = use_project_store((s) => s.setProjects)

	useEffect(() => {
		if (!user) {
			set_projects([])
			set_store_projects([])
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
			set_projects(mapped)
			set_store_projects(mapped)
			set_is_loading(false)
		})()

		return () => {
			is_cancelled = true
		}
	}, [user, limit, set_store_projects])

	return { projects, is_loading, error }
}
