import { useEffect, useState } from 'react'
import { Image as KonvaImage } from 'react-konva'
import type { CogLayerInfo } from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

interface CogLayerProps {
	config: CogLayerInfo
}

function build_render_url(config: CogLayerInfo): string {
	const params = new URLSearchParams({
		url: config.url,
		band: String(config.band),
		palette: config.palette,
		max_width: '2048',
		max_height: '2048'
	})
	if (config.min !== undefined) params.set('min', String(config.min))
	if (config.max !== undefined) params.set('max', String(config.max))
	return `${API_BASE}/cog/render?${params}`
}

export function cog_layer_component({ config }: CogLayerProps) {
	const [img, set_img] = useState<HTMLImageElement | undefined>(undefined)
	const render_url = build_render_url(config)

	useEffect(() => {
		if (!config.visible) {
			set_img(undefined)
			return
		}
		let is_cancelled = false
		const image = new window.Image()
		image.crossOrigin = 'anonymous'
		image.onload = () => {
			if (!is_cancelled) set_img(image)
		}
		image.onerror = () => {
			console.error('Failed to load COG layer render:', render_url)
		}
		image.src = render_url
		return () => {
			is_cancelled = true
		}
	}, [render_url, config.visible])

	if (!config.visible || !img) return undefined

	return (
		<KonvaImage
			image={img}
			width={img.naturalWidth}
			height={img.naturalHeight}
			x={0}
			y={0}
			opacity={config.opacity / 100}
		/>
	)
}
