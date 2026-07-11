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
		const width = Math.round(full_width * scale)
		const height = Math.round(full_height * scale)

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

export async function tiff_data_url_to_file(
	data_url: string,
	original_name: string
): Promise<File> {
	const res = await fetch(data_url)
	const blob = await res.blob()
	const base = original_name.replace(/\.tiff?$/i, '')
	return new File([blob], `${base}.png`, { type: 'image/png' })
}
