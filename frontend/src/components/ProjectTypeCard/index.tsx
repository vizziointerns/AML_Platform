import { type ReactNode } from 'react'

interface ProjectTypeCardProps {
	title: string
	description: string
	icon3d: ReactNode
	is_selected: boolean
	on_select: () => void
	is_dark_mode: boolean
}

/* ── Aesthetic 3D SVG icons ── */

function icon_object_detection() {
	return (
		<svg viewBox="0 0 72 72" fill="none" className="w-full h-full drop-shadow-xl">
			<defs>
				<radialGradient id="od-bg" cx="50%" cy="40%" r="55%">
					<stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
					<stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
				</radialGradient>
				<linearGradient id="od-face" x1="0" y1="0" x2="72" y2="72">
					<stop offset="0%" stopColor="#60a5fa" />
					<stop offset="100%" stopColor="#6366f1" />
				</linearGradient>
				<linearGradient id="od-top" x1="0" y1="0" x2="72" y2="72">
					<stop offset="0%" stopColor="#93c5fd" />
					<stop offset="100%" stopColor="#818cf8" />
				</linearGradient>
			</defs>
			<circle cx="36" cy="34" r="30" fill="url(#od-bg)" />
			{/* 3D isometric box */}
			<path
				d="M36 12L58 24V48L36 60L14 48V24Z"
				fill="url(#od-face)"
				fillOpacity="0.3"
				stroke="url(#od-face)"
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
			<path
				d="M36 12L58 24L36 36L14 24Z"
				fill="url(#od-top)"
				fillOpacity="0.4"
				stroke="url(#od-top)"
				strokeWidth="1.2"
				strokeLinejoin="round"
			/>
			<path
				d="M58 24V48L36 60V36Z"
				fill="url(#od-face)"
				fillOpacity="0.2"
				stroke="url(#od-face)"
				strokeWidth="1.2"
				strokeLinejoin="round"
			/>
			{/* Crosshair on front face */}
			<ellipse
				cx="36"
				cy="38"
				rx="6"
				ry="4"
				stroke="#93c5fd"
				strokeWidth="1.5"
				fill="none"
				opacity="0.8"
			/>
			<line
				x1="36"
				y1="30"
				x2="36"
				y2="46"
				stroke="#93c5fd"
				strokeWidth="1.5"
				strokeLinecap="round"
				opacity="0.7"
			/>
			<line
				x1="28"
				y1="38"
				x2="44"
				y2="38"
				stroke="#93c5fd"
				strokeWidth="1.5"
				strokeLinecap="round"
				opacity="0.7"
			/>
		</svg>
	)
}

function icon_segmentation() {
	return (
		<svg viewBox="0 0 72 72" fill="none" className="w-full h-full drop-shadow-xl">
			<defs>
				<radialGradient id="sg-bg" cx="50%" cy="40%" r="55%">
					<stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
					<stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
				</radialGradient>
				<linearGradient id="sg-grad" x1="0" y1="0" x2="72" y2="72">
					<stop offset="0%" stopColor="#4ade80" />
					<stop offset="100%" stopColor="#06b6d4" />
				</linearGradient>
			</defs>
			<circle cx="36" cy="34" r="30" fill="url(#sg-bg)" />
			{/* 3D layered grid */}
			<path
				d="M36 10L60 24V52L36 66L12 52V24Z"
				fill="url(#sg-grad)"
				fillOpacity="0.15"
				stroke="url(#sg-grad)"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			{/* Grid divisions */}
			<path
				d="M36 10V66"
				stroke="url(#sg-grad)"
				strokeWidth="1"
				strokeDasharray="2 3"
				opacity="0.4"
			/>
			<path
				d="M24 17V58"
				stroke="url(#sg-grad)"
				strokeWidth="1"
				strokeDasharray="2 3"
				opacity="0.3"
			/>
			<path
				d="M48 17V58"
				stroke="url(#sg-grad)"
				strokeWidth="1"
				strokeDasharray="2 3"
				opacity="0.3"
			/>
			<path
				d="M12 24H60"
				stroke="url(#sg-grad)"
				strokeWidth="1"
				strokeDasharray="2 3"
				opacity="0.4"
			/>
			<path
				d="M12 34H60"
				stroke="url(#sg-grad)"
				strokeWidth="1"
				strokeDasharray="2 3"
				opacity="0.4"
			/>
			<path
				d="M12 44H60"
				stroke="url(#sg-grad)"
				strokeWidth="1"
				strokeDasharray="2 3"
				opacity="0.4"
			/>
			{/* Colored cell highlights */}
			<path d="M36 24L48 30V40L36 34Z" fill="#4ade80" fillOpacity="0.25" />
			<path d="M24 24L36 30V40L24 34Z" fill="#06b6d4" fillOpacity="0.2" />
			<path d="M36 34L48 40V50L36 44Z" fill="#06b6d4" fillOpacity="0.2" />
			<path d="M24 34L36 40V50L24 44Z" fill="#4ade80" fillOpacity="0.2" />
		</svg>
	)
}

function icon_instance_segmentation() {
	return (
		<svg viewBox="0 0 72 72" fill="none" className="w-full h-full drop-shadow-xl">
			<defs>
				<radialGradient id="is-bg" cx="50%" cy="40%" r="55%">
					<stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
					<stop offset="100%" stopColor="#f97316" stopOpacity="0" />
				</radialGradient>
				<linearGradient id="is-g1" x1="0" y1="0" x2="72" y2="72">
					<stop offset="0%" stopColor="#fb923c" />
					<stop offset="100%" stopColor="#ef4444" />
				</linearGradient>
				<linearGradient id="is-g2" x1="0" y1="0" x2="72" y2="72">
					<stop offset="0%" stopColor="#c084fc" />
					<stop offset="100%" stopColor="#e879f9" />
				</linearGradient>
				<linearGradient id="is-g3" x1="0" y1="0" x2="72" y2="72">
					<stop offset="0%" stopColor="#60a5fa" />
					<stop offset="100%" stopColor="#2dd4bf" />
				</linearGradient>
			</defs>
			<circle cx="36" cy="34" r="30" fill="url(#is-bg)" />
			{/* Layer 1 — orange */}
			<path
				d="M24 12L46 24V46L24 58L2 46V24Z"
				fill="url(#is-g1)"
				fillOpacity="0.2"
				stroke="url(#is-g1)"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<path d="M24 12L46 24L24 36L2 24Z" fill="url(#is-g1)" fillOpacity="0.3" />
			{/* Layer 2 — purple */}
			<path
				d="M36 18L58 30V52L36 64L14 52V30Z"
				fill="url(#is-g2)"
				fillOpacity="0.2"
				stroke="url(#is-g2)"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			<path d="M36 18L58 30L36 42L14 30Z" fill="url(#is-g2)" fillOpacity="0.35" />
			{/* Layer 3 — blue-teal */}
			<path
				d="M28 26L48 38V56L28 68L8 56V38Z"
				fill="url(#is-g3)"
				fillOpacity="0.15"
				stroke="url(#is-g3)"
				strokeWidth="1.5"
				strokeLinejoin="round"
			/>
			{/* Instance dots */}
			<circle cx="24" cy="30" r="2.5" fill="#fb923c" fillOpacity="0.9" />
			<circle cx="40" cy="36" r="2.5" fill="#c084fc" fillOpacity="0.9" />
			<circle cx="28" cy="48" r="2.5" fill="#60a5fa" fillOpacity="0.9" />
		</svg>
	)
}

export const ICON_3D = {
	object_detection: icon_object_detection,
	segmentation: icon_segmentation,
	instance_segmentation: icon_instance_segmentation
} as const

export function project_type_card({
	title,
	description,
	icon3d: Icon3d,
	is_selected,
	on_select,
	is_dark_mode
}: ProjectTypeCardProps) {
	const is_dark = is_dark_mode

	// Glassmorphism styles
	const base_bg = is_dark ? 'bg-zinc-900/70 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl'
	const base_border = is_dark ? 'border-zinc-700/50' : 'border-zinc-200/50'
	const base_shadow = is_dark ? 'shadow-md shadow-black/20' : 'shadow-md shadow-zinc-200/50'

	const hover_bg = is_dark ? 'hover:bg-zinc-900/90' : 'hover:bg-white/90'
	const hover_scale = 'hover:scale-[1.04] hover:-translate-y-1'
	const hover_shadow = is_dark
		? 'hover:shadow-2xl hover:shadow-black/40'
		: 'hover:shadow-xl hover:shadow-zinc-300/50'

	const selected_ring = 'ring-2 ring-blue-500 border-blue-500'
	const selected_glow = is_dark ? 'shadow-lg shadow-blue-500/15' : 'shadow-lg shadow-blue-500/20'

	return (
		<button
			type="button"
			onClick={on_select}
			className={`
				group relative flex flex-col items-center gap-3 rounded-2xl border p-6
				transition-all duration-300 ease-out cursor-pointer select-none
				${base_bg} ${base_border} ${base_shadow}
				${hover_bg} ${hover_scale} ${hover_shadow}
				${is_selected ? `${selected_ring} ${selected_glow}` : ''}
				min-w-[200px] flex-1
			`}
		>
			{/* 3D icon — tilts on hover */}
			<div className="relative w-20 h-20 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3">
				{Icon3d}
			</div>

			{/* Title */}
			<span
				className={`text-sm font-semibold text-center ${is_dark ? 'text-zinc-100' : 'text-zinc-900'}`}
			>
				{title}
			</span>

			{/* Description — slides in on hover, icon+title remain visible */}
			<div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-out w-full">
				<div className="overflow-hidden">
					<span
						className={`block text-xs leading-relaxed text-center pt-4 ${is_dark ? 'text-zinc-400' : 'text-zinc-500'}`}
					>
						{description}
					</span>
				</div>
			</div>
		</button>
	)
}
