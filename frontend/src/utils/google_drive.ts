import { supabase } from './supabase'

const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'
const ROOT_FOLDER_NAME = 'test_folder'

interface DriveFileRecord {
	id: string
	name: string
}

interface DriveListResponse {
	files?: DriveFileRecord[]
}

interface DriveCreateResponse {
	id?: string
}

interface EnsureProjectFolderParams {
	access_token: string
	project_id: string
	project_name: string
	existing_folder_id?: string
	user_folder_id: string
}

interface EnsureDatasetFolderParams {
	access_token: string
	project_id: string
	project_name: string
	dataset_id: string
	dataset_name: string
	existing_project_folder_id?: string
	existing_dataset_folder_id?: string
	user_folder_id: string
}

interface ProjectFolderRow {
	name?: string
	drive_folder_id?: string
}

function escape_drive_query_value(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

async function parse_drive_error(response: Response): Promise<string> {
	let message = `Google Drive request failed (${response.status})`

	try {
		const payload = (await response.json()) as {
			error?: { message?: string }
		}
		message = payload.error?.message ?? message
	} catch {
		/* ignore */
	}

	return message
}

async function list_drive_files(access_token: string, query: string): Promise<DriveFileRecord[]> {
	const url = new URL(DRIVE_FILES_API)
	url.searchParams.set('q', query)
	url.searchParams.set('fields', 'files(id,name)')
	url.searchParams.set('pageSize', '10')

	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 30000)

	try {
		const response = await fetch(url.toString(), {
			headers: {
				Authorization: `Bearer ${access_token}`
			},
			signal: controller.signal
		})

		if (!response.ok) {
			throw new Error(await parse_drive_error(response))
		}

		const payload = (await response.json()) as DriveListResponse
		return payload.files ?? []
	} finally {
		clearTimeout(timeout)
	}
}

async function create_drive_folder(
	access_token: string,
	name: string,
	parents: string[],
	app_properties: Record<string, string>
): Promise<string> {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 30000)

	try {
		const response = await fetch(DRIVE_FILES_API, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${access_token}`,
				'Content-Type': 'application/json; charset=UTF-8'
			},
			body: JSON.stringify({
				name,
				mimeType: DRIVE_FOLDER_MIME_TYPE,
				parents: parents.length > 0 ? parents : undefined,
				appProperties: app_properties
			}),
			signal: controller.signal
		})

		if (!response.ok) {
			throw new Error(await parse_drive_error(response))
		}

		const payload = (await response.json()) as DriveCreateResponse
		if (!payload.id) {
			throw new Error('Google Drive folder creation succeeded without returning an id')
		}

		return payload.id
	} finally {
		clearTimeout(timeout)
	}
}

async function find_folder_by_property(
	access_token: string,
	property_key: string,
	property_value: string,
	parent_id?: string
): Promise<string | undefined> {
	const filters = [
		`mimeType='${DRIVE_FOLDER_MIME_TYPE}'`,
		'trashed=false',
		`appProperties has { key='${escape_drive_query_value(property_key)}' and value='${escape_drive_query_value(property_value)}' }`
	]

	if (parent_id) {
		filters.push(`'${escape_drive_query_value(parent_id)}' in parents`)
	}

	const [folder] = await list_drive_files(access_token, filters.join(' and '))
	return folder?.id
}

async function get_current_user_id(): Promise<string> {
	const { data: user_data } = await supabase.auth.getUser()
	const user_id = user_data?.user?.id
	if (!user_id) {
		throw new Error('User not authenticated')
	}
	return user_id
}

export async function get_user_folder_id(access_token: string): Promise<string> {
	const user_id = await get_current_user_id()
	return ensure_user_folder(access_token, user_id)
}

async function ensure_root_folder(access_token: string): Promise<string> {
	const existing = await find_folder_by_property(access_token, 'entity_type', 'root')
	if (existing) return existing

	return create_drive_folder(access_token, ROOT_FOLDER_NAME, [], {
		entity_type: 'root'
	})
}

async function ensure_user_folder(access_token: string, user_id: string): Promise<string> {
	const root_folder_id = await ensure_root_folder(access_token)

	const existing = await find_folder_by_property(access_token, 'user_id', user_id, root_folder_id)
	if (existing) return existing

	return create_drive_folder(access_token, user_id, [root_folder_id], {
		entity_type: 'user',
		user_id
	})
}

export async function ensure_project_drive_folder({
	access_token,
	project_id,
	project_name,
	existing_folder_id,
	user_folder_id
}: EnsureProjectFolderParams): Promise<string> {
	if (existing_folder_id) return existing_folder_id

	const existing = await find_folder_by_property(
		access_token,
		'project_id',
		project_id,
		user_folder_id
	)
	if (existing) return existing

	return create_drive_folder(access_token, project_name, [user_folder_id], {
		entity_type: 'project',
		project_id
	})
}

export async function ensure_dataset_drive_folder({
	access_token,
	project_id,
	project_name,
	dataset_id,
	dataset_name,
	existing_project_folder_id,
	existing_dataset_folder_id,
	user_folder_id
}: EnsureDatasetFolderParams): Promise<{
	project_folder_id: string
	dataset_folder_id: string
}> {
	const project_folder_id = await ensure_project_drive_folder({
		access_token,
		project_id,
		project_name,
		existing_folder_id: existing_project_folder_id,
		user_folder_id
	})

	if (existing_dataset_folder_id) {
		return {
			project_folder_id,
			dataset_folder_id: existing_dataset_folder_id
		}
	}

	const existing_dataset_folder = await find_folder_by_property(
		access_token,
		'dataset_id',
		dataset_id,
		project_folder_id
	)

	if (existing_dataset_folder) {
		return {
			project_folder_id,
			dataset_folder_id: existing_dataset_folder
		}
	}

	const dataset_folder_id = await create_drive_folder(
		access_token,
		dataset_name,
		[project_folder_id],
		{
			entity_type: 'dataset',
			project_id,
			dataset_id
		}
	)

	return {
		project_folder_id,
		dataset_folder_id
	}
}

export async function ensure_new_dataset_drive_folder(
	access_token: string,
	project_id: string,
	dataset_id: string,
	dataset_name: string
): Promise<string> {
	const user_folder_id = await get_user_folder_id(access_token)

	const { data: project_row, error: project_error } = await supabase
		.from('projects')
		.select('name, drive_folder_id')
		.eq('id', project_id)
		.single()

	if (project_error || !project_row) {
		throw new Error(project_error?.message ?? 'Failed to load project information')
	}

	const ensured = await ensure_dataset_drive_folder({
		access_token,
		project_id,
		project_name: (project_row as ProjectFolderRow).name ?? 'Project',
		dataset_id,
		dataset_name,
		existing_project_folder_id: (project_row as ProjectFolderRow).drive_folder_id ?? undefined,
		user_folder_id
	})

	if (!(project_row as ProjectFolderRow).drive_folder_id) {
		await supabase
			.from('projects')
			.update({ drive_folder_id: ensured.project_folder_id })
			.eq('id', project_id)
	}

	return ensured.dataset_folder_id
}
