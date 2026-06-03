import { api_client } from './client'
import type { Project } from '../store/projectStore'

export async function fetch_projects(): Promise<Project[]> {
	const { data } = await api_client.get<Project[]>('/projects')
	return data
}

export async function fetch_recent_projects(limit = 4): Promise<Project[]> {
	const { data } = await api_client.get<Project[]>('/projects', {
		params: { sort: 'lastUpdated', order: 'desc', limit }
	})
	return data
}
