import { api_client } from './client'
import { supabase } from '../utils/supabase'
import type { Project } from '../store/projectStore'
import { map_project, type DbProject } from '../utils/project_mapping'

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

export async function pin_project(project_id: string, is_pinned: boolean): Promise<void> {
	const { error } = await supabase.from('projects').update({ is_pinned }).eq('id', project_id)

	if (error) throw new Error(error.message)
}

export async function delete_project_from_db(project_id: string): Promise<void> {
	const { error } = await supabase.from('projects').delete().eq('id', project_id)

	if (error) throw new Error(error.message)
}

export async function rename_project_in_db(project_id: string, new_name: string): Promise<void> {
	const { error } = await supabase
		.from('projects')
		.update({ name: new_name, last_updated: Date.now() })
		.eq('id', project_id)

	if (error) throw new Error(error.message)
}

export async function update_cover_image_in_db(
	project_id: string,
	cover_image_url: string
): Promise<void> {
	const { error } = await supabase
		.from('projects')
		.update({ cover_image_url, last_updated: Date.now() })
		.eq('id', project_id)

	if (error) throw new Error(error.message)
}

export async function remove_cover_image_from_db(project_id: string): Promise<void> {
	const { error } = await supabase
		.from('projects')
		.update({ cover_image_url: '', last_updated: Date.now() })
		.eq('id', project_id)

	if (error) throw new Error(error.message)
}

export async function duplicate_project_in_db(
	project_id: string,
	user_id: string
): Promise<Project | undefined> {
	const { data: original, error: fetch_error } = await supabase
		.from('projects')
		.select('*')
		.eq('id', project_id)
		.single()

	if (fetch_error) throw new Error(fetch_error.message)
	if (!original) return undefined

	const new_id = crypto.randomUUID()
	const { error: insert_error } = await supabase.from('projects').insert({
		...original,
		id: new_id,
		user_id,
		name: `${original.name} (Copy)`,
		last_updated: Date.now(),
		is_pinned: false
	})

	if (insert_error) throw new Error(insert_error.message)

	const { data: inserted, error: refetch_error } = await supabase
		.from('projects')
		.select('*')
		.eq('id', new_id)
		.single()

	if (refetch_error) throw new Error(refetch_error.message)
	if (!inserted) return undefined

	return map_project(inserted as DbProject)
}
