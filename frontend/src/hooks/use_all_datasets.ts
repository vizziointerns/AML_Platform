import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { use_auth } from '../contexts/auth_context'
import type { ProjectType } from '../store/projectStore'

export interface GlobalDatasetInfo {
	id: string
	project_id: string
	project_name: string
	project_type: ProjectType
	name: string
	description: string | null
	status: string
	image_count: number
	class_count: number
	tags: string[]
	storage_bytes: number
	created_at: string
	updated_at: string
}

export interface UseAllDatasetsResult {
	datasets: GlobalDatasetInfo[]
	is_loading: boolean
	error: string | undefined
	refresh: () => void
}

export function use_all_datasets(): UseAllDatasetsResult {
	const { user } = use_auth()
	const [datasets, set_datasets] = useState<GlobalDatasetInfo[]>([])
	const [is_loading, set_is_loading] = useState(true)
	const [error, set_error] = useState<string | undefined>()
	const [refresh_key, set_refresh_key] = useState(0)

	const do_fetch = useCallback(async () => {
		if (!user) {
			set_datasets([])
			set_is_loading(false)
			set_error(undefined)
			return
		}

		set_is_loading(true)
		set_error(undefined)

		const { data: projects, error: proj_err } = await supabase
			.from('projects')
			.select('id, name, type')
			.eq('user_id', user.id)

		if (proj_err) {
			set_error(proj_err.message)
			set_is_loading(false)
			return
		}

		if (!projects || projects.length === 0) {
			set_datasets([])
			set_is_loading(false)
			return
		}

		const project_ids = projects.map((p: { id: string }) => p.id)
		const project_map = new Map<string, { name: string; type: ProjectType }>(
			projects.map((p: { id: string; name: string; type: string }) => [
				p.id,
				{ name: p.name, type: p.type as ProjectType }
			])
		)

		const { data, error: ds_err } = await supabase
			.from('datasets')
			.select('*')
			.in('project_id', project_ids)
			.order('created_at', { ascending: false })

		if (ds_err) {
			if (
				ds_err.message?.includes('does not exist') ||
				ds_err.message?.includes('Could not find the table')
			) {
				set_datasets([])
			} else {
				set_error(ds_err.message)
			}
			set_is_loading(false)
			return
		}

		const normalized = (data ?? []).map((row: Record<string, unknown>) => {
			const project_info = project_map.get(row.project_id as string)
			return {
				...row,
				tags: Array.isArray(row.tags) ? row.tags : [],
				image_count: (row.image_count as number) ?? 0,
				class_count: (row.class_count as number) ?? 0,
				storage_bytes: (row.storage_bytes as number) ?? 0,
				project_name: project_info?.name ?? 'Unknown Project',
				project_type: project_info?.type ?? 'Object Detection'
			}
		})

		set_datasets(normalized as GlobalDatasetInfo[])
		set_is_loading(false)
	}, [user])

	useEffect(() => {
		do_fetch()
	}, [do_fetch, refresh_key])

	const refresh = useCallback(() => {
		set_refresh_key((k) => k + 1)
	}, [])

	return { datasets, is_loading, error, refresh }
}
