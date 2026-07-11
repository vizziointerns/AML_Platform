import { fromArrayBuffer } from 'geotiff'

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

function compute_band_stats(data: TypedArray): { min: number; max: number } {
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

function fill_grayscale_pixels(
	pixels: Uint8ClampedArray,
	data: TypedArray,
	min: number,
	max: number
): void {
	const range = max - min
	for (let i = 0; i < data.length; i++) {
		const v = data[i]
		let val: number
		if (v === undefined || !Number.isFinite(v) || range === 0) {
			val = 0
		} else {
			val = Math.round(((v - min) / range) * 255)
		}
		pixels[i * 4] = val
		pixels[i * 4 + 1] = val
		pixels[i * 4 + 2] = val
		pixels[i * 4 + 3] = 255
	}
}

export async function generate_tiff_preview(file: File): Promise<string | undefined> {
	try {
		const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = () => resolve(reader.result as ArrayBuffer)
			reader.onerror = () => reject(reader.error)
			reader.readAsArrayBuffer(file)
		})

		const tiff = await fromArrayBuffer(buf)
		const image = await tiff.getImage()
		const full_width = image.getWidth()
		const full_height = image.getHeight()

		const max_pixels = 200
		const scale = Math.min(1, max_pixels / full_width, max_pixels / full_height)
		const width = Math.max(1, Math.round(full_width * scale))
		const height = Math.max(1, Math.round(full_height * scale))

		const raster = await image.readRasters({
			samples: [0],
			interleave: false,
			width,
			height
		})

		const band_data = (raster as unknown as TypedArray[])[0]
		if (!band_data) return undefined

		const stats = compute_band_stats(band_data)

		const canvas = document.createElement('canvas')
		canvas.width = width
		canvas.height = height
		const ctx = canvas.getContext('2d')!
		const image_data = ctx.createImageData(width, height)

		fill_grayscale_pixels(image_data.data, band_data, stats.min, stats.max)

		ctx.putImageData(image_data, 0, 0)
		return canvas.toDataURL('image/png')
	} catch (err) {
		console.warn('TIFF preview failed:', file.name, err)
		return undefined
	}
}

function fill_rgb_pixels(
	pixels: Uint8ClampedArray,
	r_data: TypedArray,
	g_data: TypedArray | undefined,
	b_data: TypedArray | undefined,
	r_min: number,
	r_max: number,
	g_min: number,
	g_max: number,
	b_min: number,
	b_max: number
): void {
	const r_range = r_max - r_min || 1
	const g_range = (g_max - g_min) || 1
	const b_range = (b_max - b_min) || 1
	for (let i = 0; i < r_data.length; i++) {
		const r = Math.round(((r_data[i] ?? 0 - r_min) / r_range) * 255)
		const g = g_data ? Math.round(((g_data[i] ?? 0 - g_min) / g_range) * 255) : r
		const b = b_data ? Math.round(((b_data[i] ?? 0 - b_min) / b_range) * 255) : r
		pixels[i * 4] = Math.max(0, Math.min(255, r))
		pixels[i * 4 + 1] = Math.max(0, Math.min(255, g))
		pixels[i * 4 + 2] = Math.max(0, Math.min(255, b))
		pixels[i * 4 + 3] = 255
	}
}

export async function convert_tiff_to_png(
	file: File,
	max_dimension = 1024
): Promise<string> {
	const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as ArrayBuffer)
		reader.onerror = () => reject(reader.error)
		reader.readAsArrayBuffer(file)
	})

	const tiff = await fromArrayBuffer(buf)
	const image = await tiff.getImage()
	const full_width = image.getWidth()
	const full_height = image.getHeight()
	const band_count = image.getSamplesPerPixel()

	const scale = Math.min(1, max_dimension / full_width, max_dimension / full_height)
	const width = Math.max(1, Math.round(full_width * scale))
	const height = Math.max(1, Math.round(full_height * scale))

	const sample_indices: number[] = []
	if (band_count >= 3) {
		sample_indices.push(0, 1, 2)
	} else {
		sample_indices.push(0)
	}

	const raster = await image.readRasters({
		samples: sample_indices,
		interleave: false,
		width,
		height
	})

	const bands = raster as unknown as TypedArray[]

	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')!
	const image_data = ctx.createImageData(width, height)

	if (sample_indices.length >= 3) {
		const r = bands[0]
		const g = bands[1]
		const b = bands[2]
		if (!r) throw new Error('Missing red band data')
		const r_stats = compute_band_stats(r)
		const g_stats = g ? compute_band_stats(g) : r_stats
		const b_stats = b ? compute_band_stats(b) : r_stats
		fill_rgb_pixels(
			image_data.data,
			r,
			g,
			b,
			r_stats.min,
			r_stats.max,
			g_stats.min,
			g_stats.max,
			b_stats.min,
			b_stats.max
		)
	} else {
		const band_data = bands[0]
		if (!band_data) throw new Error('Missing band data')
		const stats = compute_band_stats(band_data)
		fill_grayscale_pixels(image_data.data, band_data, stats.min, stats.max)
	}

	ctx.putImageData(image_data, 0, 0)
	return canvas.toDataURL('image/png')
}

export async function tiff_data_url_to_file(
	data_url: string,
	original_name: string
): Promise<File> {
	const res = await fetch(data_url)
	const blob = await res.blob()
	const base = original_name.replace(/\.tiff?$/i, '')
	return new File([blob], `${base}.png`, { type: 'image/png' })
}
