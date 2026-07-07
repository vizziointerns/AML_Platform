import { useEffect, useRef, useState } from 'react'
import { render_cog_to_canvas, is_tiff_url } from '../utils/cog'
import type { PaletteName } from '../utils/colormaps'

export function use_cog_background(
	url: string | undefined,
	palette: PaletteName,
	band: number,
	opacity: number
): string | undefined {
	const [result_url, set_result_url] = useState<string | undefined>(undefined)
	const prev_blob_ref = useRef<string | undefined>(undefined)
	const fetch_id_ref = useRef(0)

	useEffect(() => {
		if (!url || !is_tiff_url(url)) {
			set_result_url(url)
			return
		}

		const id = ++fetch_id_ref.current
		const canvas = document.createElement('canvas')

		;(async () => {
			try {
				await render_cog_to_canvas(url, canvas, {
					id: 'cog-bg',
					url,
					name: 'background',
					visible: true,
					opacity,
					band,
					palette,
					composite_mode: 'single'
				})

				if (id !== fetch_id_ref.current) return

				canvas.toBlob((blob) => {
					if (blob && id === fetch_id_ref.current) {
						const blob_url = URL.createObjectURL(blob)
						if (prev_blob_ref.current?.startsWith('blob:')) {
							URL.revokeObjectURL(prev_blob_ref.current)
						}
						prev_blob_ref.current = blob_url
						set_result_url(blob_url)
					}
				}, 'image/png')
			} catch {
				console.error('Failed to render COG background:', url)
			}
		})()
	}, [url, palette, band, opacity])

	useEffect(() => {
		return () => {
			if (prev_blob_ref.current?.startsWith('blob:')) {
				URL.revokeObjectURL(prev_blob_ref.current)
			}
		}
	}, [])

	return !url || !is_tiff_url(url) ? url : result_url
}
