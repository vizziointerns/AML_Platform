import React, { type Dispatch, type SetStateAction } from 'react'
import { BookMarked, PanelRight, X } from 'lucide-react'
import type { Mode, Annotation, ClassInfo, Prediction } from './types'
import { render_left_panel } from './class_list'
import { render_right_properties_panel } from './properties_panel_wrapper'
import { render_layers_panel } from './layer_panel'

type IconComponent = React.ComponentType<{ size?: number | string }>

export function show_satellite_panel(is_cog: boolean, ext: string | undefined): boolean {
	return is_cog || !!ext?.match(/^tiff?$/i)
}

export function mobile_toolbar(params: {
	tools: readonly { id: Mode; icon: IconComponent; label: string }[]
	active_tool: string
	set_active_tool: (tool: Mode) => void
}) {
	const { tools, active_tool, set_active_tool } = params
	return (
		<div className="lg:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-xl border shadow-lg bg-black/70 backdrop-blur-sm border-zinc-700">
			{tools.map((tool) => {
				const ICON = tool.icon
				return (
					<button
						key={tool.id}
						onClick={() => set_active_tool(tool.id)}
						title={tool.label}
						className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-[11px] ${
							active_tool === tool.id
								? 'bg-blue-600 text-white shadow-sm'
								: 'text-zinc-400 hover:text-white hover:bg-white/10'
						}`}
					>
						<ICON size={15} />
					</button>
				)
			})}
		</div>
	)
}

export function mobile_panel_buttons(params: {
	is_mob_classes: boolean
	set_is_mob_classes: Dispatch<SetStateAction<boolean>>
	is_mob_right: boolean
	set_is_mob_right: Dispatch<SetStateAction<boolean>>
}) {
	const { is_mob_classes, set_is_mob_classes, is_mob_right, set_is_mob_right } = params
	return (
		<div className="lg:hidden fixed top-32 left-2 z-50 flex flex-col gap-2">
			<button
				onClick={() => set_is_mob_classes((v) => !v)}
				className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-sm transition-colors ${is_mob_classes ? 'bg-blue-600 text-white' : 'bg-black/70 text-zinc-300 hover:bg-black/80'}`}
				title="Classes"
			>
				<BookMarked size={16} />
			</button>
			<button
				onClick={() => set_is_mob_right((v) => !v)}
				className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-lg backdrop-blur-sm transition-colors ${is_mob_right ? 'bg-blue-600 text-white' : 'bg-black/70 text-zinc-300 hover:bg-black/80'}`}
				title="Properties"
			>
				<PanelRight size={16} />
			</button>
		</div>
	)
}

export function mobile_classes_overlay(params: {
	is_mob_classes: boolean
	set_is_mob_classes: Dispatch<SetStateAction<boolean>>
	left_width: number
	border_subtle: string
	bg_panel: string
	tools: readonly {
		id: Mode
		icon: React.ComponentType<React.PropsWithChildren<unknown>>
		label: string
	}[]
	active_tool: string
	set_active_tool: (tool: Mode) => void
	isDarkMode: boolean
	brush_size: number
	set_brush_size: (size: number) => void
	brush_opacity: number
	set_brush_opacity: (opacity: number) => void
	is_classes_open: boolean
	set_is_classes_open: (open: boolean) => void
	text_heading: string
	text_muted: string
	bg_hover: string
	classes: ClassInfo[]
	active_class: string
	set_active_class: (cls: string) => void
	annotations: Annotation[]
	is_dragging_left: React.MutableRefObject<boolean>
	theme_current_count: (id: string, annotations: Annotation[]) => number
	handle_create_class: (name: string, color?: string) => void
	handle_rename_class: (id: string, new_name: string) => void
	handle_delete_class: (id: string) => void
	renaming_class_id: string | undefined
	set_renaming_class_id: (id: string | undefined) => void
	delete_class_id: string | undefined
	set_delete_class_id: (id: string | undefined) => void
	new_class_name: string
	set_new_class_name: (name: string) => void
}) {
	const { is_mob_classes, set_is_mob_classes, border_subtle, bg_panel } = params
	return (
		<>
			<div
				className={`lg:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${is_mob_classes ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
				onClick={() => set_is_mob_classes(false)}
			/>
			<div
				className={`lg:hidden fixed left-0 top-0 z-50 h-full w-72 border-r shadow-2xl overflow-y-auto ${border_subtle} ${bg_panel} transition-transform duration-200 ${is_mob_classes ? 'translate-x-0' : '-translate-x-full'}`}
			>
				<div className={`p-3 border-b ${border_subtle} flex items-center justify-between`}>
					<span className={`text-sm font-semibold ${params.text_heading}`}>Classes</span>
					<button
						onClick={() => set_is_mob_classes(false)}
						className={`p-1 rounded-md ${params.bg_hover} ${params.text_muted}`}
					>
						<X size={16} />
					</button>
				</div>
				{render_left_panel(
					params.left_width,
					params.border_subtle,
					params.bg_panel,
					params.tools,
					params.active_tool,
					params.set_active_tool,
					params.isDarkMode,
					params.brush_size,
					params.set_brush_size,
					params.brush_opacity,
					params.set_brush_opacity,
					params.is_classes_open,
					params.set_is_classes_open,
					params.text_heading,
					params.text_muted,
					params.bg_hover,
					params.classes,
					params.active_class,
					params.set_active_class,
					params.annotations,
					params.is_dragging_left,
					params.theme_current_count,
					params.handle_create_class,
					params.handle_rename_class,
					params.handle_delete_class,
					params.renaming_class_id,
					params.set_renaming_class_id,
					params.delete_class_id,
					params.set_delete_class_id,
					params.new_class_name,
					params.set_new_class_name,
					true
				)}
			</div>
		</>
	)
}

export function mobile_right_overlay(params: {
	is_mob_right: boolean
	set_is_mob_right: Dispatch<SetStateAction<boolean>>
	border_subtle: string
	bg_panel: string
	bg_hover: string
	text_heading: string
	text_muted: string
	is_cog_project: boolean
	selected_ann_id: string | undefined
	selected_prediction_id: string | undefined
	annotations: Annotation[]
	classes: ClassInfo[]
	set_annotations: (fn: (prev: Annotation[]) => Annotation[]) => void
	isDarkMode: boolean
	predictions: Prediction[]
	set_predictions: (fn: (prev: Prediction[]) => Prediction[]) => void
	set_selected_prediction_id: (id: string | undefined) => void
	set_selected_ann_id: (id: string | undefined) => void
	is_showing_predictions: boolean
	set_is_showing_predictions: (v: boolean) => void
	is_layers_open: boolean
	set_is_layers_open: (v: boolean) => void
	get_class_color: (id: string) => string
	get_class_name: (id: string) => string
}) {
	const {
		is_mob_right,
		set_is_mob_right,
		border_subtle,
		bg_panel,
		bg_hover,
		text_heading,
		text_muted
	} = params
	if (!is_mob_right) return undefined
	return (
		<>
			<div
				className="lg:hidden fixed inset-0 z-40 bg-black/40"
				onClick={() => set_is_mob_right(false)}
			/>
			<div
				className={`lg:hidden fixed right-0 top-0 z-50 h-full w-80 border-l shadow-2xl overflow-y-auto ${bg_panel} ${border_subtle}`}
			>
				<div className={`h-12 border-b ${border_subtle} flex items-center px-4`}>
					<h3 className={`text-sm font-semibold ${text_heading}`}>Properties</h3>
					<button
						onClick={() => set_is_mob_right(false)}
						className={`ml-auto p-1 rounded-md ${bg_hover} ${text_muted}`}
					>
						<X size={16} />
					</button>
				</div>
				{render_right_properties_panel(
					params.is_cog_project,
					params.selected_ann_id,
					params.selected_prediction_id,
					params.annotations,
					params.classes,
					params.set_annotations,
					params.isDarkMode,
					text_muted,
					text_heading,
					border_subtle,
					params.predictions,
					params.set_predictions,
					params.set_selected_prediction_id,
					params.set_selected_ann_id,
					params.is_showing_predictions,
					params.set_is_showing_predictions
				)}
				{render_layers_panel(
					params.annotations,
					params.predictions,
					params.is_layers_open,
					params.set_is_layers_open,
					params.is_showing_predictions,
					params.selected_ann_id,
					params.selected_prediction_id,
					params.set_selected_ann_id,
					params.set_selected_prediction_id,
					params.set_annotations,
					params.get_class_color,
					params.get_class_name,
					params.isDarkMode,
					text_muted,
					text_heading,
					border_subtle
				)}
			</div>
		</>
	)
}
