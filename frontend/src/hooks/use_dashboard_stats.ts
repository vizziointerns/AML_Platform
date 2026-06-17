import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { use_auth } from '../contexts/auth_context'

export interface DashboardStats {
	total_projects: number
	total_images: number
	team_members: number
	storage_used_bytes: number
}

export interface UseDashboardStatsResult {
	stats: DashboardStats | undefined
	is_loading: boolean
	error: string | undefined
}

export function use_dashboard_stats(): UseDashboardStatsResult {
	const { user } = use_auth()
	const [stats, set_stats] = useState<DashboardStats | undefined>()
	const [is_loading, set_is_loading] = useState(true)
	const [error, set_error] = useState<string | undefined>()
	const [refresh_key, set_refresh_key] = useState(0)

	const refresh = useCallback(() => {
		set_refresh_key((current) => current + 1)
	}, [])

	useEffect(() => {
		if (!user) {
			set_stats(undefined)
			set_error(undefined)
			set_is_loading(false)
			return
		}

		let is_cancelled = false
		set_is_loading(true)
		set_error(undefined)
		;(async () => {
			const {
				data: project_rows,
				count,
				error: err
			} = await supabase
				.from('projects')
				.select('id, members', { count: 'exact' })
				.eq('user_id', user.id)

			if (is_cancelled) return

			if (err) {
				if (
					err.message?.includes('does not exist') ||
					err.message?.includes('Could not find the table')
				) {
					set_stats({ total_projects: 0, total_images: 0, team_members: 0, storage_used_bytes: 0 })
				} else {
					set_error(err.message)
				}
				set_is_loading(false)
				return
			}

			const project_ids = (project_rows ?? []).map((project) => project.id).filter(Boolean)
			let total_images = 0
			let storage_used_bytes = 0

			if (project_ids.length > 0) {
				const { data: datasets, error: dataset_err } = await supabase
					.from('datasets')
					.select('image_count, storage_bytes')
					.in('project_id', project_ids)

				if (is_cancelled) return

				if (dataset_err) {
					if (
						!dataset_err.message?.includes('does not exist') &&
						!dataset_err.message?.includes('Could not find the table') &&
						dataset_err.code !== '406'
					) {
						set_error(dataset_err.message)
						set_is_loading(false)
						return
					}
				} else {
					total_images = (datasets ?? []).reduce(
						(sum, dataset) => sum + (dataset.image_count ?? 0),
						0
					)
					storage_used_bytes = (datasets ?? []).reduce(
						(sum, dataset) => sum + (dataset.storage_bytes ?? 0),
						0
					)
				}
			}

			const unique_members = new Set<string>()
			for (const p of project_rows ?? []) {
				for (const m of p.members ?? []) {
					unique_members.add(m)
				}
			}
			set_stats({
				total_projects: count ?? 0,
				total_images,
				team_members: unique_members.size,
				storage_used_bytes
			})
			set_is_loading(false)
		})()

		return () => {
			is_cancelled = true
		}
	}, [user, refresh_key])

	useEffect(() => {
		if (!user) return

		const channel = supabase
			.channel(`dashboard-stats-${user.id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'projects',
					filter: `user_id=eq.${user.id}`
				},
				refresh
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'datasets'
				},
				refresh
			)
			.subscribe()

		const on_focus = () => refresh()
		window.addEventListener('focus', on_focus)
		window.addEventListener('datasets-changed', refresh)
		window.addEventListener('upload-complete', refresh)

		return () => {
			window.removeEventListener('focus', on_focus)
			window.removeEventListener('datasets-changed', refresh)
			window.removeEventListener('upload-complete', refresh)
			void supabase.removeChannel(channel)
		}
	}, [user, refresh])

	return { stats, is_loading, error }
}
