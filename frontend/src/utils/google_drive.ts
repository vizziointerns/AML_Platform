import { supabase } from './supabase'

const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'
const ROOT_FOLDER_NAME = 'test_folder'

interface DriveCreateResponse {
	id?: string
}

interface DriveListResponse {
	files?: { id: string; name: string }[]
}

async function parse_drive_error(response: Response): Promise<string> {
	try {
		const payload = (await response.json()) as { error?: { message?: string } }
		return payload.error?.message ?? `HTTP ${response.status}`
	} catch {
		return `HTTP ${response.status}`
	}
}

async function create_drive_folder(
	access_token: string,
	name: string,
	parents: string[]
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
				parents: parents.length > 0 ? parents : undefined
			}),
			signal: controller.signal
		})

		if (!response.ok) {
			throw new Error(await parse_drive_error(response))
		}

		const payload = (await response.json()) as DriveCreateResponse
		if (!payload.id) {
			throw new Error('Folder creation returned no id')
		}

		return payload.id
	} finally {
		clearTimeout(timeout)
	}
}

async function find_folder_by_name(
	access_token: string,
	name: string,
	parent_id?: string
): Promise<string | undefined> {
	const filters = [
		`mimeType='${DRIVE_FOLDER_MIME_TYPE}'`,
		'trashed=false',
		`name='${name.replace(/'/g, "\\'")}'`
	]

	if (parent_id) {
		filters.push(`'${parent_id}' in parents`)
	}

	const url = new URL(DRIVE_FILES_API)
	url.searchParams.set('q', filters.join(' and '))
	url.searchParams.set('fields', 'files(id,name)')
	url.searchParams.set('pageSize', '10')

	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 30000)

	try {
		const response = await fetch(url.toString(), {
			headers: { Authorization: `Bearer ${access_token}` },
			signal: controller.signal
		})

		if (!response.ok) {
			throw new Error(await parse_drive_error(response))
		}

		const payload = (await response.json()) as DriveListResponse
		return payload.files?.[0]?.id
	} finally {
		clearTimeout(timeout)
	}
}

async function get_current_user_id(): Promise<string> {
	const { data: user_data } = await supabase.auth.getUser()
	const user_id = user_data?.user?.id
	if (!user_id) {
		throw new Error('User not authenticated')
	}
	return user_id
}

/* Create or find: test_folder */
async function get_root_folder_id(access_token: string): Promise<string> {
	const existing = await find_folder_by_name(access_token, ROOT_FOLDER_NAME)
	if (existing) return existing

	return create_drive_folder(access_token, ROOT_FOLDER_NAME, [])
}

/* Create or find: test_folder / {user_id} */
async function get_user_folder_id_raw(access_token: string, user_id: string): Promise<string> {
	const root_id = await get_root_folder_id(access_token)

	const existing = await find_folder_by_name(access_token, user_id, root_id)
	if (existing) return existing

	return create_drive_folder(access_token, user_id, [root_id])
}

export async function get_user_folder_id(access_token: string): Promise<string> {
	const user_id = await get_current_user_id()
	return get_user_folder_id_raw(access_token, user_id)
}

/* Create or find: test_folder / {user_id} / {project_name} */
export async function ensure_project_drive_folder(params: {
	access_token: string
	project_name: string
	user_folder_id: string
}): Promise<string> {
	const { access_token, project_name, user_folder_id } = params

	const existing = await find_folder_by_name(access_token, project_name, user_folder_id)
	if (existing) return existing

	return create_drive_folder(access_token, project_name, [user_folder_id])
}

/* Create or find: test_folder / {user_id} / {project_name} / {dataset_name}
   Returns both project and dataset folder IDs */
export async function ensure_dataset_drive_folder(params: {
	access_token: string
	project_name: string
	dataset_name: string
	existing_project_folder_id?: string
	existing_dataset_folder_id?: string
	user_folder_id: string
}): Promise<{
	project_folder_id: string
	dataset_folder_id: string
}> {
	const {
		access_token,
		project_name,
		dataset_name,
		existing_project_folder_id,
		existing_dataset_folder_id,
		user_folder_id
	} = params

	let project_folder_id: string
	if (existing_project_folder_id) {
		project_folder_id = existing_project_folder_id
	} else {
		project_folder_id = await ensure_project_drive_folder({
			access_token,
			project_name,
			user_folder_id
		})
	}

	if (existing_dataset_folder_id) {
		return { project_folder_id, dataset_folder_id: existing_dataset_folder_id }
	}

	const existing_dataset = await find_folder_by_name(access_token, dataset_name, project_folder_id)
	if (existing_dataset) {
		return { project_folder_id, dataset_folder_id: existing_dataset }
	}

	const dataset_folder_id = await create_drive_folder(access_token, dataset_name, [
		project_folder_id
	])

	return { project_folder_id, dataset_folder_id }
}

export async function ensure_new_dataset_drive_folder(
	access_token: string,
	project_id: string,
	_dataset_id: string,
	dataset_name: string
): Promise<string> {
	const user_folder_id = await get_user_folder_id(access_token)

	const { data: project_row } = await supabase
		.from('projects')
		.select('name, drive_folder_id')
		.eq('id', project_id)
		.single()

	const project_name = project_row?.name ?? 'Project'

	const ensured = await ensure_dataset_drive_folder({
		access_token,
		project_name,
		dataset_name,
		existing_project_folder_id: project_row?.drive_folder_id ?? undefined,
		user_folder_id
	})

	if (!project_row?.drive_folder_id) {
		await supabase
			.from('projects')
			.update({ drive_folder_id: ensured.project_folder_id })
			.eq('id', project_id)
	}

	return ensured.dataset_folder_id
}
