import {
	Square,
	Hexagon,
	Pencil,
	ListTree,
	ChevronRight,
	ChevronDown,
	Trash2,
	CheckCircle2
} from 'lucide-react'
import type { Annotation, Prediction, LayerActionSet } from './types'

export function render_type_icon(layer_type: string) {
	if (layer_type === 'bbox') return <Square size={14} />
	if (layer_type === 'mask') return <Pencil size={14} />
	return <Hexagon size={14} />
}

export function render_annotation_layer_item(
	layer: Annotation,
	selected_ann_id: string | undefined,
	get_class_color: (id: string) => string,
	get_class_name: (id: string) => string,
	actions: LayerActionSet,
	isDarkMode: boolean,
	text_heading: string
) {
	const layer_color = get_class_color(layer.classId)
	const status_color =
		layer.status === 'approved'
			? 'text-emerald-500'
			: layer.status === 'needs_review'
				? 'text-amber-500'
				: 'text-zinc-400'
	const type_icon = render_type_icon(layer.type)

	return (
		<div
			key={layer.id}
			onClick={() => actions.set_selected_ann_id(layer.id)}
			className={`w-full flex items-center justify-between p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors group cursor-pointer border ${selected_ann_id === layer.id ? (isDarkMode ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white') : 'border-transparent'}`}
		>
			<div className="flex items-center gap-3 overflow-hidden">
				<div className="w-4 flex justify-center shrink-0">{type_icon}</div>
				<div className="flex items-center gap-1.5">
					<div className="w-2 h-2 rounded-full" style={{ backgroundColor: layer_color }}></div>
					<span className={`text-sm ${text_heading} font-medium`}>
						{get_class_name(layer.classId)}_{layer.id.substring(0, 4)}
					</span>
				</div>
			</div>
			<div className="flex items-center gap-2">
				{layer.status && (
					<span title={`Status: ${layer.status}`}>
						<CheckCircle2 size={12} className={status_color} />
					</span>
				)}
				<div
					className={`flex items-center gap-1 transition-opacity ${selected_ann_id === layer.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
				>
					<button
						onClick={(e) => {
							e.stopPropagation()
							if (layer.lockedBy) {
								alert('Locked! Cannot delete.')
								return
							}
							actions.set_annotations((prev: Annotation[]) =>
								prev.filter((a: Annotation) => a.id !== layer.id)
							)
						}}
						className={`p-1 hover:text-red-500 ${layer.lockedBy ? 'opacity-30 cursor-not-allowed text-zinc-500' : 'text-zinc-500'}`}
						title={layer.lockedBy ? 'Locked' : 'Delete'}
					>
						<Trash2 size={14} />
					</button>
				</div>
			</div>
		</div>
	)
}

export function render_prediction_layer_item(
	layer: Prediction,
	selected_prediction_id: string | undefined,
	get_class_color: (id: string) => string,
	get_class_name: (id: string) => string,
	set_selected_prediction_id: (id: string | undefined) => void,
	isDarkMode: boolean,
	text_heading: string
) {
	const layer_color = get_class_color(layer.classId)
	const type_icon = render_type_icon(layer.type)

	return (
		<div
			key={layer.id}
			onClick={() => set_selected_prediction_id(layer.id)}
			className={`w-full flex items-center justify-between p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors group cursor-pointer border ${selected_prediction_id === layer.id ? (isDarkMode ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white') : 'border-dashed border-zinc-500/30'}`}
		>
			<div className="flex items-center gap-3 opacity-80">
				<div className="w-4 flex justify-center text-zinc-400">{type_icon}</div>
				<div className="flex items-center gap-1.5">
					<div className="w-2 h-2 rounded-full" style={{ backgroundColor: layer_color }}></div>
					<span className={`text-sm ${text_heading} font-medium italic`}>
						[AI] {get_class_name(layer.classId)}
					</span>
				</div>
			</div>
		</div>
	)
}

export function render_layers_panel(
	annotations: Annotation[],
	predictions: Prediction[],
	is_layers_open: boolean,
	set_is_layers_open: (v: boolean) => void,
	is_showing_predictions: boolean,
	selected_ann_id: string | undefined,
	selected_prediction_id: string | undefined,
	set_selected_ann_id: (id: string | undefined) => void,
	set_selected_prediction_id: (id: string | undefined) => void,
	set_annotations: (fn: (prev: Annotation[]) => Annotation[]) => void,
	get_class_color: (id: string) => string,
	get_class_name: (id: string) => string,
	isDarkMode: boolean,
	text_muted: string,
	text_heading: string,
	border_subtle: string
) {
	const actions: LayerActionSet = {
		selected_ann_id,
		selected_prediction_id,
		set_selected_ann_id,
		set_selected_prediction_id,
		set_annotations
	}

	return (
		<div className="flex-1 flex flex-col min-h-0">
			<button
				onClick={() => set_is_layers_open(!is_layers_open)}
				className={`flex items-center justify-between p-3 border-b ${border_subtle} hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors w-full text-left`}
			>
				<div
					className={`flex items-center gap-2 text-sm font-semibold tracking-tight ${text_heading}`}
				>
					<ListTree size={16} className={text_muted} /> Layers ({annotations.length})
				</div>
				{is_layers_open ? (
					<ChevronDown size={14} className={text_muted} />
				) : (
					<ChevronRight size={14} className={text_muted} />
				)}
			</button>

			{is_layers_open && (
				<div className="flex-1 overflow-y-auto p-2 space-y-1">
					{annotations.map((layer) =>
						render_annotation_layer_item(
							layer,
							selected_ann_id,
							get_class_color,
							get_class_name,
							actions,
							isDarkMode,
							text_heading
						)
					)}

					{predictions.length > 0 && is_showing_predictions && (
						<div
							className={`py-2 px-1 text-xs font-semibold ${text_muted} uppercase tracking-wider`}
						>
							Predictions
						</div>
					)}
					{is_showing_predictions &&
						predictions.map((layer) =>
							render_prediction_layer_item(
								layer,
								selected_prediction_id,
								get_class_color,
								get_class_name,
								set_selected_prediction_id,
								isDarkMode,
								text_heading
							)
						)}

					{annotations.length === 0 && predictions.length === 0 && (
						<div className={`p-4 text-center text-xs ${text_muted}`}>No annotations yet.</div>
					)}
				</div>
			)}
		</div>
	)
}
