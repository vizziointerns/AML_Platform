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
	return file_url.includes('drive.google.com') || file_url.includes('googleapis.com/drive')
}

async function resolve_drive_api(
	file_id: string,
	access_token: string
): Promise<string | undefined> {
	try {
		const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${file_id}?alt=media`, {
			headers: { Authorization: `Bearer ${access_token}` }
		})
		if (!resp.ok) return undefined
		const blob = await resp.blob()
		return URL.createObjectURL(blob)
	} catch {
		return undefined
	}
}

export async function resolve_drive_file(
	file_url: string,
	access_token: string | undefined
): Promise<string> {
	if (!is_drive_url(file_url)) return file_url

	const file_id = extract_file_id(file_url)
	if (!file_id) return file_url

	if (access_token) {
		const blob_url = await resolve_drive_api(file_id, access_token)
		if (blob_url) return blob_url
	}

	return `https://drive.google.com/thumbnail?id=${file_id}&sz=w1000`
}

export async function resolve_image_urls(
	images: { file_url: string }[],
	access_token: string | undefined
): Promise<string[]> {
	const created_blobs: string[] = []
	for (const img of images) {
		if (!is_drive_url(img.file_url)) continue
		const resolved = await resolve_drive_file(img.file_url, access_token)
		if (resolved !== img.file_url) created_blobs.push(resolved)
		img.file_url = resolved
	}
	return created_blobs
}
