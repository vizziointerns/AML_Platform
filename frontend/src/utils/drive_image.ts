function get_api_base(): string {
	return import.meta.env.VITE_API_BASE_URL ?? '/api'
}

function is_tiff_name(name: string): boolean {
	const lower = name.toLowerCase()
	return lower.endsWith('.tif') || lower.endsWith('.tiff')
}

export function extract_file_id(file_url: string): string | undefined {
	if (file_url.includes('googleapis.com/drive')) {
		const parts = file_url.split('/')
		const idx = parts.indexOf('files')
		if (idx !== -1 && parts[idx + 1]) return parts[idx + 1]
	}
	const match = file_url.match(/[?&]id=([^&?]+)/)
	if (match) return match[1]
	return undefined
}

export function is_drive_url(file_url: string): boolean {
	return (
		file_url.includes('drive.google.com') ||
		file_url.includes('googleapis.com/drive') ||
		file_url.includes('drive.usercontent.google.com')
	)
}

export async function resolve_drive_file(file_url: string, file_name?: string): Promise<string> {
	if (!is_drive_url(file_url)) return file_url
	// TIFF files go through the COG pipeline — keep original URL
	if (file_name && is_tiff_name(file_name)) return file_url

	const file_id = extract_file_id(file_url)
	if (!file_id) return file_url

	return `${get_api_base()}/images/drive/${file_id}`
}

export async function resolve_image_urls(
	images: { file_url: string; file_name?: string }[]
): Promise<string[]> {
	const resolved: string[] = []
	for (const img of images) {
		const resolved_url = await resolve_drive_file(img.file_url, img.file_name)
		if (resolved_url !== img.file_url) {
			img.file_url = resolved_url
			resolved.push(resolved_url)
		}
	}
	return resolved
}
