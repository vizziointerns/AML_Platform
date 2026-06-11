const cache = new Map<string, string>()

export function get_cached_accent_color(image_url: string): string | undefined {
	return cache.get(image_url)
}

export function cache_accent_color(image_url: string, color: string): void {
	cache.set(image_url, color)
}

export function extract_dominant_color(
	image_url: string,
	on_color: (color: string) => void,
	on_error?: () => void
): () => void {
	const cached = get_cached_accent_color(image_url)
	if (cached) {
		on_color(cached)
		return () => {}
	}

	let is_cancelled = false
	const img = new Image()
	img.crossOrigin = 'anonymous'

	img.onload = () => {
		if (is_cancelled) return

		const canvas = document.createElement('canvas')
		const size = 5
		canvas.width = size
		canvas.height = size
		const raw_ctx = canvas.getContext('2d')
		if (!raw_ctx) {
			on_error?.()
			return
		}

		raw_ctx.drawImage(img, 0, 0, size, size)
		const raw_data = raw_ctx.getImageData(0, 0, size, size).data

		let r = 0
		let g = 0
		let b = 0
		let count = 0
		for (let i = 0; i < raw_data.length; i += 4) {
			r += raw_data[i]!
			g += raw_data[i + 1]!
			b += raw_data[i + 2]!
			count++
		}

		const color = `rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`
		cache_accent_color(image_url, color)

		if (!is_cancelled) {
			on_color(color)
		}
	}

	img.onerror = () => {
		on_error?.()
	}

	img.src = image_url

	return () => {
		is_cancelled = true
	}
}
