import React, { useState, useCallback } from 'react'
import type { ElementType } from 'react'
import { Target, Layers, Shapes, Tags, Dot, FileText, Video, Box, Sparkles } from 'lucide-react'

export interface TypeCardOption {
	value: string
	label: string
	summary: string
	detail_title: string
	detail_description: string
	detail_use_cases: string[]
}

const CARD_ICONS: Record<string, ElementType> = {
	'Object Detection': Target,
	'Semantic Segmentation': Layers,
	'Instance Segmentation': Shapes,
	Classification: Tags,
	'Keypoint Detection': Dot,
	OCR: FileText,
	'Video Tracking': Video,
	'3D Vision': Box
}

function render_card_icon(value: string, size: number) {
	const icon = CARD_ICONS[value] ?? Sparkles
	return React.createElement(icon as ElementType, { size })
}

function card_classes(is_selected: boolean, is_dark_mode: boolean) {
	if (is_selected) {
		return is_dark_mode
			? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/10'
			: 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10'
	}
	return is_dark_mode ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white'
}

function icon_box_classes(is_selected: boolean, is_dark_mode: boolean) {
	if (is_selected) return 'bg-blue-500/20 text-blue-500'
	return is_dark_mode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
}

function label_classes(is_selected: boolean, is_dark_mode: boolean) {
	if (is_selected) return is_dark_mode ? 'text-blue-300' : 'text-blue-700'
	return is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
}

export function project_type_card({
	option,
	is_selected,
	is_dark_mode,
	on_select
}: {
	option: TypeCardOption
	is_selected: boolean
	is_dark_mode: boolean
	on_select: () => void
}) {
	const [is_hovered, set_is_hovered] = useState(false)

	const handle_mouse_enter = useCallback(() => set_is_hovered(true), [])
	const handle_mouse_leave = useCallback(() => set_is_hovered(false), [])
	const handle_focus = useCallback(() => set_is_hovered(true), [])
	const handle_blur = useCallback(() => set_is_hovered(false), [])

	return (
		<button
			type="button"
			onClick={on_select}
			onMouseEnter={handle_mouse_enter}
			onMouseLeave={handle_mouse_leave}
			onFocus={handle_focus}
			onBlur={handle_blur}
			className={`relative h-[240px] w-full rounded-xl border text-left outline-none transition-all duration-300 ease-out
				transform-gpu ${is_hovered ? 'scale-[1.1] shadow-xl z-10' : 'shadow-sm'}
				${card_classes(is_selected, is_dark_mode)}
				focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950`}
		>
			<div className="p-6 flex flex-col h-full">
				<div className="flex items-start gap-5 flex-shrink-0">
					<div
						className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 transition-colors duration-200 ${icon_box_classes(is_selected, is_dark_mode)}`}
					>
						{render_card_icon(option.value, 24)}
					</div>
					<div className="flex-1 min-w-0 pt-0.5">
						<div
							className={`text-base font-semibold leading-tight ${label_classes(is_selected, is_dark_mode)}`}
						>
							{option.label}
						</div>
					</div>
				</div>

				<div
					className={`transition-all duration-300 ease-out ${
						is_hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
					}`}
				>
					<div
						className={`pt-3 ${is_dark_mode ? 'border-t border-zinc-800' : 'border-t border-zinc-100'}`}
					>
						<p
							className={`text-xs leading-relaxed ${
								is_dark_mode ? 'text-zinc-300' : 'text-zinc-600'
							}`}
						>
							{option.detail_description}
						</p>
					</div>
				</div>

				<div className="flex-1" />
			</div>
		</button>
	)
}

export default project_type_card
