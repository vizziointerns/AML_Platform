import { is_tiff_url } from '../utils/cog'
import type { PaletteName } from '../utils/colormaps'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export function use_cog_background(
	url: string | undefined,
	palette: PaletteName,
	band: number,
	file_name?: string,
	file_extension?: string
): string | undefined {
	if (!url) return undefined
	const is_tiff =
		is_tiff_url(url) ||
		(file_name ? is_tiff_url(file_name) : false) ||
		file_extension === 'tif' ||
		file_extension === 'tiff'
	if (!is_tiff) return url

	const params = new URLSearchParams({
		url,
		band: String(band),
		palette,
		max_width: '2048',
		max_height: '2048'
	})

	return `${API_BASE}/cog/render?${params}`
}
