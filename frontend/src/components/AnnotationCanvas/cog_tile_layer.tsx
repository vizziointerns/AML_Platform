import { useEffect, useMemo, useRef, useState } from 'react'
import { Image as KonvaImage } from 'react-konva'
import type { CogLayerInfo } from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'
const TILE_SIZE = 256

interface PosSize {
	x: number
	y: number
	width: number
	height: number
}

function build_tile_url(config: CogLayerInfo, z: number, x: number, y: number): string {
	const params = new URLSearchParams({
		url: config.url,
		band: String(config.band),
		palette: config.palette
	})
	if (config.min !== undefined) params.set('min', String(config.min))
	if (config.max !== undefined) params.set('max', String(config.max))
	return `${API_BASE}/cog/tile/${z}/${x}/${y}.png?${params}`
}

interface CogTileLayerProps {
	config: CogLayerInfo
	viewport: PosSize
}

export function cog_tile_layer_component({ config, viewport }: CogTileLayerProps) {
	const [loaded_tiles, set_loaded_tiles] = useState<Record<string, HTMLImageElement>>({})
	const loading_ref = useRef<Set<string>>(new Set())

	const tile_info = useMemo(() => {
		const base_dim = Math.max(viewport.width / TILE_SIZE, viewport.height / TILE_SIZE)
		const z = Math.max(0, Math.ceil(Math.log2(base_dim)))
		const total = 2 ** z
		const tile_w = viewport.width / total
		const tile_h = viewport.height / total

		const start_x = Math.max(0, Math.floor(viewport.x / tile_w))
		const end_x = Math.min(total - 1, Math.ceil((viewport.x + viewport.width) / tile_w))
		const start_y = Math.max(0, Math.floor(viewport.y / tile_h))
		const end_y = Math.min(total - 1, Math.ceil((viewport.y + viewport.height) / tile_h))

		const tiles: { z: number; x: number; y: number; px: number; py: number }[] = []
		for (let tx = start_x; tx <= end_x; tx++) {
			for (let ty = start_y; ty <= end_y; ty++) {
				tiles.push({ z, x: tx, y: ty, px: tx * tile_w, py: ty * tile_h })
			}
		}
		return { z, tiles, tile_w, tile_h }
	}, [viewport.x, viewport.y, viewport.width, viewport.height])

	const { z, tiles: visible_tiles, tile_w, tile_h } = tile_info

	const config_key = `${config.url}|${config.band}|${config.palette}|${config.min}|${config.max}`
	const tiles_key = visible_tiles.map((t) => `${t.z}/${t.x}/${t.y}`).join(',')

	useEffect(() => {
		const current_loading = new Set(loading_ref.current)
		current_loading.clear()

		for (const tile of visible_tiles) {
			const url = build_tile_url(config, tile.z, tile.x, tile.y)
			const tile_key = `${tile.z}/${tile.x}/${tile.y}`
			if (loaded_tiles[tile_key] || current_loading.has(tile_key)) continue
			current_loading.add(tile_key)

			const img = new window.Image()
			img.crossOrigin = 'anonymous'
			img.onload = () => {
				current_loading.delete(tile_key)
				set_loaded_tiles((prev) => ({ ...prev, [tile_key]: img }))
			}
			img.onerror = () => {
				current_loading.delete(tile_key)
				console.error('Failed to load COG tile:', url)
			}
			img.src = url
		}
		loading_ref.current = current_loading

		const still_valid = new Set(visible_tiles.map((t) => `${t.z}/${t.x}/${t.y}`))
		set_loaded_tiles((prev) => {
			const next = { ...prev }
			for (const key of Object.keys(next)) {
				if (!still_valid.has(key)) delete next[key]
			}
			return next
		})
	}, [z, config_key, tiles_key])

	if (!config.visible) return undefined

	return (
		<>
			{visible_tiles.map((tile) => {
				const tile_key = `${tile.z}/${tile.x}/${tile.y}`
				const img = loaded_tiles[tile_key]
				if (!img) return undefined
				return (
					<KonvaImage
						key={tile_key}
						image={img}
						x={tile.px}
						y={tile.py}
						width={tile_w}
						height={tile_h}
						opacity={config.opacity / 100}
					/>
				)
			})}
		</>
	)
}
