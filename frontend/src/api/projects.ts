import { api_client } from './client'
import type { Project } from '../store/projectStore'
import { supabase } from '../utils/supabase'

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

export async function update_project(project_id: string, updates: Partial<Project>): Promise<void> {
	const db_updates: Record<string, string | undefined> = {}
	if (updates.task_type !== undefined) db_updates.task_type = updates.task_type
	if (updates.name !== undefined) db_updates.name = updates.name
	if (updates.description !== undefined) db_updates.description = updates.description

	const { error } = await supabase.from('projects').update(db_updates).eq('id', project_id)

	if (error) {
		throw new Error(`Failed to update project: ${error.message}`)
	}
}
