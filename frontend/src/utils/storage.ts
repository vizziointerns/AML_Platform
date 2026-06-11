import { supabase } from './supabase'

const BUCKET_NAME = 'project-covers'

/**
 * Allowed MIME types for cover images.
 */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

function validate_image(file: File): string | undefined {
	if (!ALLOWED_TYPES.includes(file.type)) {
		return 'Only .jpg, .png, and .webp files are accepted.'
	}
	if (file.size > MAX_FILE_SIZE) {
		return 'File must be under 5 MB.'
	}
	return undefined
}

/**
 * Upload a cover image for a project.
 * Returns the public URL of the uploaded image, or throws an error.
 */
export async function upload_cover_image(file: File, project_id: string): Promise<string> {
	const validation_error = validate_image(file)
	if (validation_error) throw new Error(validation_error)

	const ext = file.name.split('.').pop() ?? 'jpg'
	const file_path = `${project_id}/cover.${ext}`

	const { error: upload_error } = await supabase.storage
		.from(BUCKET_NAME)
		.upload(file_path, file, { upsert: true })

	if (upload_error) throw new Error(upload_error.message)

	const { data: public_data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(file_path)

	return public_data.publicUrl
}

/**
 * Delete the cover image for a project from storage.
 */
export async function delete_cover_image(project_id: string): Promise<void> {
	const { data: files } = await supabase.storage.from(BUCKET_NAME).list(project_id)

	if (files && files.length > 0) {
		const paths = files.map((f) => `${project_id}/${f.name}`)
		const { error } = await supabase.storage.from(BUCKET_NAME).remove(paths)
		if (error) throw new Error(error.message)
	}
}
