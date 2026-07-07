import { fromUrl } from 'geotiff'
import { get_palette, type PaletteName } from './colormaps'

export interface CogLayerConfig {
	id: string
	url: string
	name: string
	visible: boolean
	opacity: number
	band: number
	palette: PaletteName
	min?: number
	max?: number
	composite_mode: 'single'
}

export interface CogMetadata {
	width: number
	height: number
	band_count: number
	no_data?: number
}

const pending_renders = new WeakMap<HTMLCanvasElement, number>()

export async function load_cog_metadata(url: string): Promise<CogMetadata> {
	const tiff = await fromUrl(url, { allowFullFile: false })
	const image = await tiff.getImage()
	const meta: CogMetadata = {
		width: image.getWidth(),
		height: image.getHeight(),
		band_count: image.getSamplesPerPixel(),
		no_data: image.getGDALNoData() ?? undefined
	}
	return meta
}

function compute_min_max(data: TypedArray): { min: number; max: number } {
	let min = Infinity
	let max = -Infinity
	for (let i = 0; i < data.length; i++) {
		const v = data[i]
		if (v === undefined || !Number.isFinite(v)) continue
		if (v < min) min = v
		if (v > max) max = v
	}
	return { min, max }
}

function fill_zero_pixels(pixels: Uint8ClampedArray): void {
	pixels.fill(0)
	for (let i = 3; i < pixels.length; i += 4) {
		pixels[i] = 255
	}
}

function fill_band_pixels(
	pixels: Uint8ClampedArray,
	data: TypedArray,
	palette: Uint8Array,
	min: number,
	range: number
): void {
	for (let i = 0; i < data.length; i++) {
		const v = data[i]
		let idx: number
		if (v === undefined || !Number.isFinite(v)) {
			idx = 0
		} else {
			const t = (v - min) / range
			idx = Math.max(0, Math.min(255, Math.round(t * 255)))
		}
		const base = idx * 3
		pixels[i * 4] = palette[base]!
		pixels[i * 4 + 1] = palette[base + 1]!
		pixels[i * 4 + 2] = palette[base + 2]!
		pixels[i * 4 + 3] = 255
	}
}

function fill_pixels(
	pixels: Uint8ClampedArray,
	data: TypedArray,
	palette: Uint8Array,
	min: number,
	max: number
): void {
	const range = max - min
	if (range === 0) {
		fill_zero_pixels(pixels)
		return
	}
	fill_band_pixels(pixels, data, palette, min, range)
}

export async function render_cog_to_canvas(
	url: string,
	canvas: HTMLCanvasElement,
	config: CogLayerConfig
): Promise<void> {
	const render_id = (pending_renders.get(canvas) ?? 0) + 1
	pending_renders.set(canvas, render_id)

	try {
		const tiff = await fromUrl(url, { allowFullFile: false })
		const image = await tiff.getImage()
		const full_width = image.getWidth()
		const full_height = image.getHeight()

		if (render_id !== pending_renders.get(canvas)) return

		const max_pixels = 2048
		const scale = Math.min(1, max_pixels / full_width, max_pixels / full_height)
		const width = Math.round(full_width * scale)
		const height = Math.round(full_height * scale)

		canvas.width = width
		canvas.height = height

		const raster = await image.readRasters({
			samples: [config.band],
			interleave: false,
			width,
			height
		})

		if (render_id !== pending_renders.get(canvas)) return

		const raster_arr = raster as unknown as TypedArray[]
		const band_data = raster_arr[0]
		if (!band_data) return

		let min = config.min
		let max = config.max

		if (min === undefined || max === undefined) {
			const stats = compute_min_max(band_data)
			min ??= stats.min
			max ??= stats.max
		}

		const palette = get_palette(config.palette)
		const ctx = canvas.getContext('2d')!
		const image_data = ctx.createImageData(width, height)

		fill_pixels(image_data.data, band_data, palette, min, max)

		ctx.putImageData(image_data, 0, 0)
	} catch (error) {
		console.error('Failed to render COG:', url, error)
		pending_renders.delete(canvas)
		throw error
	}
}

type TypedArray =
	| Int8Array
	| Uint8Array
	| Uint8ClampedArray
	| Int16Array
	| Uint16Array
	| Int32Array
	| Uint32Array
	| Float32Array
	| Float64Array

export function is_tiff_url(url: string): boolean {
	const ext = url.split('?')[0]!.toLowerCase()
	return ext.endsWith('.tif') || ext.endsWith('.tiff')
}
