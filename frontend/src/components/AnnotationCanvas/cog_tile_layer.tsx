import { useEffect, useMemo, useRef, useState } from 'react'
import { Image as KonvaImage } from 'react-konva'
import type { CogLayerInfo } from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'
const TILE_SIZE = 256

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

interface ViewportInfo {
	offset: { x: number; y: number }
	zoom_level: number
	stage_width: number
	stage_height: number
}

interface CogTileLayerProps {
	config: CogLayerInfo
	viewport: ViewportInfo
	image_width: number
	image_height: number
	skip?: boolean
}

interface TilePos {
	z: number
	x: number
	y: number
	px: number
	py: number
	w: number
	h: number
}

const PREFETCH_BUFFER = 2

function get_tile_size(
	image_width: number,
	image_height: number,
	z: number
): { tile_w: number; tile_h: number; total: number } {
	const total = 2 ** z
	return {
		total,
		tile_w: Math.floor(image_width / total) || 1,
		tile_h: Math.floor(image_height / total) || 1
	}
}

function compute_tiles(
	image_width: number,
	image_height: number,
	viewport: ViewportInfo,
	buffer: number = 0
): { z: number; tiles: TilePos[] } {
	const max_z = Math.ceil(Math.log2(Math.max(image_width, image_height)))
	const target_z = Math.ceil(
		Math.log2((Math.max(image_width, image_height) * viewport.zoom_level) / TILE_SIZE)
	)
	const z = Math.max(0, Math.min(max_z, target_z))
	const { total, tile_w, tile_h } = get_tile_size(image_width, image_height, z)

	const vx = -viewport.offset.x / viewport.zoom_level
	const vy = -viewport.offset.y / viewport.zoom_level
	const vw = viewport.stage_width / viewport.zoom_level
	const vh = viewport.stage_height / viewport.zoom_level

	const start_x = Math.max(0, Math.floor(vx / tile_w) - buffer)
	const end_x = Math.min(total - 1, Math.ceil((vx + vw) / tile_w) - 1 + buffer)
	const start_y = Math.max(0, Math.floor(vy / tile_h) - buffer)
	const end_y = Math.min(total - 1, Math.ceil((vy + vh) / tile_h) - 1 + buffer)

	const tiles: TilePos[] = []
	if (start_x > end_x || start_y > end_y) return { z, tiles }
	for (let tx = start_x; tx <= end_x; tx++) {
		for (let ty = start_y; ty <= end_y; ty++) {
			const px = tx * tile_w
			const py = ty * tile_h
			const next_px = (tx + 1) * tile_w
			const next_py = (ty + 1) * tile_h
			const tw = Math.min(next_px, image_width) - px
			const th = Math.min(next_py, image_height) - py
			tiles.push({ z, x: tx, y: ty, px, py, w: tw, h: th })
		}
	}
	return { z, tiles }
}

function parent_tile_key(tile_key: string): string | undefined {
	const parts = tile_key.split('/')
	const z_str = parts[0]
	const x_str = parts[1]
	const y_str = parts[2]
	if (z_str === undefined || x_str === undefined || y_str === undefined) return undefined
	const z = parseInt(z_str, 10)
	const x = parseInt(x_str, 10)
	const y = parseInt(y_str, 10)
	if (z <= 0) return undefined
	return `${z - 1}/${Math.floor(x / 2)}/${Math.floor(y / 2)}`
}

export function cog_tile_layer_component({
	config,
	viewport,
	image_width,
	image_height,
	skip
}: CogTileLayerProps) {
	const [loaded_tiles, set_loaded_tiles] = useState<Record<string, HTMLImageElement>>({})
	const loaded_ref = useRef<Record<string, HTMLImageElement>>({})
	const loading_ref = useRef<Set<string>>(new Set())
	const viewport_ref = useRef(viewport)
	viewport_ref.current = viewport

	const tile_info = useMemo(
		() => compute_tiles(image_width, image_height, viewport, PREFETCH_BUFFER),
		[
			image_width,
			image_height,
			viewport.offset.x,
			viewport.offset.y,
			viewport.zoom_level,
			viewport.stage_width,
			viewport.stage_height
		]
	)

	const { z: current_z } = tile_info
	const config_key = `${config.url}|${config.band}|${config.palette}|${config.min}|${config.max}`

	const image_width_ref = useRef(image_width)
	const image_height_ref = useRef(image_height)
	image_width_ref.current = image_width
	image_height_ref.current = image_height

	const config_ref = useRef(config)
	config_ref.current = config
	const skip_ref = useRef(skip)
	skip_ref.current = skip

	const current_z_ref = useRef(current_z)
	current_z_ref.current = current_z

	const visible_tiles = useMemo(
		() => compute_tiles(image_width, image_height, viewport, 0),
		[
			image_width,
			image_height,
			viewport.offset.x,
			viewport.offset.y,
			viewport.zoom_level,
			viewport.stage_width,
			viewport.stage_height
		]
	).tiles

	useEffect(() => {
		const current_loaded = loaded_ref.current
		const current_loading = loading_ref.current
		for (const k of Object.keys(current_loaded)) delete current_loaded[k]
		current_loading.clear()
		set_loaded_tiles({})
		let last_z = -1
		let last_tiles_key = ''
		let current_raf = 0
		let batch_raf = 0
		const pending_updates = new Set<string>()

		const flush_batch = () => {
			batch_raf = 0
			if (pending_updates.size === 0) return
			const keys = Array.from(pending_updates)
			pending_updates.clear()
			set_loaded_tiles((prev) => {
				const next = { ...prev }
				for (const k of keys) {
					const v = current_loaded[k]
					if (v) next[k] = v
				}
				return next
			})
		}

		const snapshot_pending = (): string[] => {
			const keys = Array.from(pending_updates)
			pending_updates.clear()
			return keys
		}

		const tick = () => {
			if (skip_ref.current) {
				current_raf = requestAnimationFrame(tick)
				return
			}
			const vp = viewport_ref.current
			const iw = image_width_ref.current
			const ih = image_height_ref.current
			const { z: next_z, tiles } = compute_tiles(iw, ih, vp, PREFETCH_BUFFER)
			const tiles_key = tiles.map((t) => `${t.x}/${t.y}`).join(',')

			if (next_z === last_z && tiles_key === last_tiles_key) {
				current_raf = requestAnimationFrame(tick)
				return
			}
			last_z = next_z
			last_tiles_key = tiles_key

			const cfg = config_ref.current
			for (const tile of tiles) {
				const tile_key = `${tile.z}/${tile.x}/${tile.y}`
				if (current_loaded[tile_key] || current_loading.has(tile_key)) continue
				current_loading.add(tile_key)

				const url = build_tile_url(cfg, tile.z, tile.x, tile.y)
				const img = new window.Image()
				img.crossOrigin = 'anonymous'
				img.onload = () => {
					current_loading.delete(tile_key)
					const current_z = current_z_ref.current
					const tile_z = parseInt(tile_key.split('/')[0], 10)
					if (Math.abs(tile_z - current_z) > 2) return
					current_loaded[tile_key] = img
					pending_updates.add(tile_key)
					if (!batch_raf) batch_raf = requestAnimationFrame(flush_batch)
				}
				img.onerror = () => {
					current_loading.delete(tile_key)
				}
				img.src = url
			}

			const still_valid = new Set(tiles.map((t) => `${t.z}/${t.x}/${t.y}`))
			for (const key of Object.keys(current_loaded)) {
				if (still_valid.has(key)) continue
				const z_part = key.split('/')[0]
				if (z_part === undefined) continue
				const key_z = parseInt(z_part, 10)
				if (key_z >= next_z - 2 && key_z <= next_z + 1) continue
				delete current_loaded[key]
				pending_updates.delete(key)
			}
			if (batch_raf) cancelAnimationFrame(batch_raf)
			batch_raf = 0
			const pending_snapshot = snapshot_pending()
			set_loaded_tiles((prev) => {
				const next = { ...prev }
				for (const key of Object.keys(next)) {
					if (still_valid.has(key)) continue
					const z_part = key.split('/')[0]
					if (z_part === undefined) continue
					const key_z = parseInt(z_part, 10)
					if (key_z >= next_z - 2 && key_z <= next_z + 1) continue
					delete next[key]
				}
				for (const key of pending_snapshot) {
					const v = current_loaded[key]
					if (v) next[key] = v
				}
				return next
			})

			current_raf = requestAnimationFrame(tick)
		}

		current_raf = requestAnimationFrame(tick)
		return () => {
			cancelAnimationFrame(current_raf)
			if (batch_raf) cancelAnimationFrame(batch_raf)
		}
	}, [config_key])

	if (skip || !config.visible) return undefined

	const rendered_fallbacks = new Set<string>()

	function render_fallback_at(key: string): React.ReactNode {
		if (rendered_fallbacks.has(key)) return undefined
		const fallback_img = loaded_tiles[key]
		if (!fallback_img) return undefined
		rendered_fallbacks.add(key)
		const parts = key.split('/')
		const fz_str = parts[0]
		const ftx_str = parts[1]
		const fty_str = parts[2]
		if (fz_str === undefined || ftx_str === undefined || fty_str === undefined) return undefined
		const fz = parseInt(fz_str, 10)
		const ftx = parseInt(ftx_str, 10)
		const fty = parseInt(fty_str, 10)
		const { tile_w: ftw, tile_h: fth } = get_tile_size(image_width, image_height, fz)
		return (
			<KonvaImage
				key={`fallback-${key}`}
				image={fallback_img}
				x={ftx * ftw}
				y={fty * fth}
				width={ftw}
				height={fth}
				opacity={(config.opacity / 100) * 0.6}
			/>
		)
	}

	function render_fallback(tile_key: string): React.ReactNode {
		const parent = parent_tile_key(tile_key)
		if (parent === undefined) return undefined
		const cached = render_fallback_at(parent)
		if (cached !== undefined) return cached
		return render_fallback(parent)
	}

	return (
		<>
			{visible_tiles.map((tile) => {
				const tile_key = `${tile.z}/${tile.x}/${tile.y}`
				const img = loaded_tiles[tile_key]
				if (img) {
					return (
						<KonvaImage
							key={tile_key}
							image={img}
							x={tile.px}
							y={tile.py}
							width={tile.w}
							height={tile.h}
							opacity={config.opacity / 100}
						/>
					)
				}
				return render_fallback(tile_key)
			})}
		</>
	)
}
