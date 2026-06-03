import { useState, useEffect } from 'react'
import { fetch_dashboard_stats } from '../api/dashboard'
import type { DashboardStats } from '../api/dashboard'

export interface UseDashboardStatsResult {
	stats: DashboardStats | undefined
	is_loading: boolean
	error: string | undefined
}

export function use_dashboard_stats(): UseDashboardStatsResult {
	const [stats, set_stats] = useState<DashboardStats | undefined>()
	const [is_loading, set_is_loading] = useState(true)
	const [error, set_error] = useState<string | undefined>()

	useEffect(() => {
		let is_cancelled = false

		set_is_loading(true)
		set_error(undefined)

		fetch_dashboard_stats()
			.then((data) => {
				if (!is_cancelled) {
					set_stats(data)
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

	return { stats, is_loading, error }
}
