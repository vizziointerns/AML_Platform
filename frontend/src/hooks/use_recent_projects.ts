import { useState, useEffect } from 'react'
import { fetch_recent_projects } from '../api/projects'
import type { Project } from '../store/projectStore'

export interface UseRecentProjectsResult {
	projects: Project[]
	is_loading: boolean
	error: string | undefined
}

export function use_recent_projects(): UseRecentProjectsResult {
	const [projects, set_projects] = useState<Project[]>([])
	const [is_loading, set_is_loading] = useState(true)
	const [error, set_error] = useState<string | undefined>()

	useEffect(() => {
		let is_cancelled = false

		set_is_loading(true)
		set_error(undefined)

		fetch_recent_projects()
			.then((data) => {
				if (!is_cancelled) {
					set_projects(data)
				}
			})
			.catch((e: Error) => {
				if (!is_cancelled) {
					set_error(e.message)
				}
			})
			.finally(() => {
				if (!is_cancelled) {
					set_is_loading(false)
				}
			})

		return () => {
			is_cancelled = true
		}
	}, [])

	return { projects, is_loading, error }
}
