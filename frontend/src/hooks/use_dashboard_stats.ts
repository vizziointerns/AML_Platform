import { useState, useEffect } from 'react'
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

	useEffect(() => {
		if (!user) {
			set_is_loading(false)
			return
		}

		let is_cancelled = false
		set_is_loading(true)
		set_error(undefined)
		;(async () => {
			const {
				data,
				count,
				error: err
			} = await supabase
				.from('projects')
				.select('dataset_count, members', { count: 'exact' })
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

			const total_images = (data ?? []).reduce((sum, p) => sum + (p.dataset_count ?? 0), 0)
			const unique_members = new Set<string>()
			for (const p of data ?? []) {
				for (const m of p.members ?? []) {
					unique_members.add(m)
				}
			}
			set_stats({
				total_projects: count ?? 0,
				total_images,
				team_members: unique_members.size,
				storage_used_bytes: 0
			})
			set_is_loading(false)
		})()

		return () => {
			is_cancelled = true
		}
	}, [user])

	return { stats, is_loading, error }
}
