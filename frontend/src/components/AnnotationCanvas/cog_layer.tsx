import { useEffect, useRef, useState } from 'react'
import { Image as KonvaImage } from 'react-konva'
import { render_cog_to_canvas } from '../../utils/cog'
import type { CogLayerInfo } from './types'

interface CogLayerProps {
	config: CogLayerInfo
}

export function cog_layer_component({ config }: CogLayerProps) {
	const canvas_ref = useRef<HTMLCanvasElement | undefined>(undefined)
	const [is_loaded, set_is_loaded] = useState(false)
	const [size, set_size] = useState({ width: 0, height: 0 })
	const render_ref = useRef(0)

	useEffect(() => {
		if (!config.visible) return

		const render_id = ++render_ref.current

		;(async () => {
			if (!canvas_ref.current) {
				canvas_ref.current = document.createElement('canvas')
			}
			const canvas = canvas_ref.current

			await render_cog_to_canvas(config.url, canvas, {
				id: config.id,
				url: config.url,
				name: config.name,
				visible: config.visible,
				opacity: config.opacity,
				band: config.band,
				palette: config.palette,
				min: config.min,
				max: config.max,
				composite_mode: config.composite_mode
			})

			if (render_id !== render_ref.current) return

			set_size({ width: canvas.width, height: canvas.height })
			set_is_loaded(true)
		})()
	}, [config.url, config.band, config.palette, config.min, config.max, config.visible])

	if (!config.visible || !is_loaded || size.width === 0) return undefined

	return (
		<KonvaImage
			image={canvas_ref.current!}
			width={size.width}
			height={size.height}
			x={0}
			y={0}
			opacity={config.opacity / 100}
		/>
	)
}
