import { api_client } from './client'

export interface DashboardStats {
	total_projects: number
	total_images: number
	team_members: number
	storage_used_bytes: number
}

export async function fetch_dashboard_stats(): Promise<DashboardStats> {
	const { data } = await api_client.get<DashboardStats>('/dashboard/stats')
	return data
}
