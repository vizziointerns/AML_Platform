import { useEffect, useState } from 'react'
import { is_tiff_url } from '../utils/cog'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export interface CogImageInfo {
	width: number
	height: number
	band_count: number
}

export function use_cog_image_info(
	url: string | undefined,
	file_name?: string,
	file_extension?: string
): CogImageInfo | undefined {
	const [info, set_info] = useState<CogImageInfo | undefined>(undefined)

	useEffect(() => {
		if (!url) {
			set_info(undefined)
			return
		}
		const is_tiff =
			is_tiff_url(url) ||
			(file_name ? is_tiff_url(file_name) : false) ||
			file_extension === 'tif' ||
			file_extension === 'tiff'
		if (!is_tiff) {
			set_info(undefined)
			return
		}

		let is_cancelled = false
		const params = new URLSearchParams({ url })
		fetch(`${API_BASE}/cog/info?${params}`)
			.then((res) => {
				if (!res.ok) throw new Error('Failed to fetch COG info')
				return res.json() as Promise<CogImageInfo>
			})
			.then((data) => {
				if (!is_cancelled) set_info(data)
			})
			.catch((err) => {
				console.error('Failed to load COG image info:', err)
				if (!is_cancelled) set_info(undefined)
			})

		return () => {
			is_cancelled = true
		}
	}, [url, file_name, file_extension])

	return info
}
