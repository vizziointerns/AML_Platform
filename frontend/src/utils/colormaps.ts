interface ColorStop {
	pos: number
	r: number
	g: number
	b: number
}

function find_stops(t: number, stops: ColorStop[]): { lo: ColorStop; hi: ColorStop } {
	let lo = stops[0]!
	let hi = stops[stops.length - 1]!
	for (let j = 0; j < stops.length - 1; j++) {
		if (t >= stops[j]!.pos && t <= stops[j + 1]!.pos) {
			lo = stops[j]!
			hi = stops[j + 1]!
			break
		}
	}
	return { lo, hi }
}

function interpolate_stops(stops: ColorStop[], size: number = 256): Uint8Array {
	const lut = new Uint8Array(size * 3)
	for (let i = 0; i < size; i++) {
		const t = i / (size - 1)
		const { lo, hi } = find_stops(t, stops)
		const span = hi.pos - lo.pos
		const f = span === 0 ? 0 : (t - lo.pos) / span
		lut[i * 3] = Math.round(lo.r + (hi.r - lo.r) * f)
		lut[i * 3 + 1] = Math.round(lo.g + (hi.g - lo.g) * f)
		lut[i * 3 + 2] = Math.round(lo.b + (hi.b - lo.b) * f)
	}
	return lut
}

const GRAYSCALE = interpolate_stops([
	{ pos: 0, r: 0, g: 0, b: 0 },
	{ pos: 1, r: 255, g: 255, b: 255 }
])

const JET = interpolate_stops([
	{ pos: 0, r: 0, g: 0, b: 128 },
	{ pos: 0.125, r: 0, g: 0, b: 255 },
	{ pos: 0.375, r: 0, g: 255, b: 255 },
	{ pos: 0.625, r: 255, g: 255, b: 0 },
	{ pos: 0.875, r: 255, g: 0, b: 0 },
	{ pos: 1, r: 128, g: 0, b: 0 }
])

const HOT = interpolate_stops([
	{ pos: 0, r: 0, g: 0, b: 0 },
	{ pos: 0.33, r: 255, g: 0, b: 0 },
	{ pos: 0.66, r: 255, g: 255, b: 0 },
	{ pos: 1, r: 255, g: 255, b: 255 }
])

const COOLWARM = interpolate_stops([
	{ pos: 0, r: 59, g: 76, b: 192 },
	{ pos: 0.5, r: 255, g: 255, b: 255 },
	{ pos: 1, r: 180, g: 4, b: 38 }
])

const VIRIDIS = interpolate_stops([
	{ pos: 0, r: 68, g: 1, b: 84 },
	{ pos: 0.1, r: 72, g: 23, b: 105 },
	{ pos: 0.2, r: 66, g: 47, b: 107 },
	{ pos: 0.3, r: 51, g: 70, b: 99 },
	{ pos: 0.4, r: 38, g: 90, b: 86 },
	{ pos: 0.5, r: 32, g: 108, b: 71 },
	{ pos: 0.6, r: 38, g: 126, b: 54 },
	{ pos: 0.7, r: 66, g: 144, b: 34 },
	{ pos: 0.8, r: 118, g: 162, b: 14 },
	{ pos: 0.9, r: 178, g: 176, b: 7 },
	{ pos: 1, r: 253, g: 231, b: 37 }
])

const PLASMA = interpolate_stops([
	{ pos: 0, r: 13, g: 8, b: 135 },
	{ pos: 0.1, r: 58, g: 8, b: 149 },
	{ pos: 0.2, r: 94, g: 14, b: 148 },
	{ pos: 0.3, r: 128, g: 27, b: 134 },
	{ pos: 0.4, r: 159, g: 44, b: 112 },
	{ pos: 0.5, r: 187, g: 64, b: 85 },
	{ pos: 0.6, r: 211, g: 88, b: 57 },
	{ pos: 0.7, r: 232, g: 115, b: 30 },
	{ pos: 0.8, r: 248, g: 148, b: 13 },
	{ pos: 0.9, r: 253, g: 187, b: 38 },
	{ pos: 1, r: 240, g: 249, b: 33 }
])

const INFERNO = interpolate_stops([
	{ pos: 0, r: 0, g: 0, b: 4 },
	{ pos: 0.1, r: 21, g: 8, b: 59 },
	{ pos: 0.2, r: 57, g: 11, b: 100 },
	{ pos: 0.3, r: 94, g: 19, b: 115 },
	{ pos: 0.4, r: 131, g: 32, b: 109 },
	{ pos: 0.5, r: 167, g: 49, b: 87 },
	{ pos: 0.6, r: 198, g: 70, b: 58 },
	{ pos: 0.7, r: 221, g: 98, b: 32 },
	{ pos: 0.8, r: 237, g: 132, b: 16 },
	{ pos: 0.9, r: 246, g: 171, b: 42 },
	{ pos: 1, r: 252, g: 253, b: 164 }
])

const TURBO = interpolate_stops([
	{ pos: 0, r: 48, g: 18, b: 59 },
	{ pos: 0.1, r: 23, g: 68, b: 136 },
	{ pos: 0.2, r: 10, g: 118, b: 178 },
	{ pos: 0.3, r: 13, g: 165, b: 179 },
	{ pos: 0.4, r: 42, g: 207, b: 143 },
	{ pos: 0.5, r: 100, g: 236, b: 87 },
	{ pos: 0.6, r: 174, g: 244, b: 42 },
	{ pos: 0.7, r: 227, g: 226, b: 30 },
	{ pos: 0.8, r: 248, g: 181, b: 29 },
	{ pos: 0.9, r: 249, g: 122, b: 35 },
	{ pos: 1, r: 236, g: 63, b: 44 }
])

const PALETTES: Record<string, Uint8Array> = {
	grayscale: GRAYSCALE,
	jet: JET,
	hot: HOT,
	coolwarm: COOLWARM,
	viridis: VIRIDIS,
	plasma: PLASMA,
	inferno: INFERNO,
	turbo: TURBO
}

export type PaletteName = keyof typeof PALETTES

export const PALETTE_NAMES: PaletteName[] = Object.keys(PALETTES) as PaletteName[]

export function get_palette(name: PaletteName): Uint8Array {
	return PALETTES[name]!
}
