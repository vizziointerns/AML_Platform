import { type ReactNode, useRef } from 'react'
import {
	Square,
	Hexagon,
	Pencil,
	ZoomIn,
	ZoomOut,
	Maximize,
	Trash2,
	Save,
	Loader2,
	Undo,
	Redo,
	Hash,
	CheckCircle2,
	ChevronRight,
	ChevronDown,
	Plus,
	ChevronLeft,
	ArrowLeft,
	ListTree,
	Check,
	Eye,
	EyeOff,
	Layers,
	type LucideProps
} from 'lucide-react'
import type { Annotation, Prediction, ClassInfo, LayerActionSet, Mode } from './types'
import type { CogLayerInfo } from '../../../../components/AnnotationCanvas/types'
import { PALETTE_NAMES } from '../../../../utils/colormaps'
import type { PaletteName } from '../../../../utils/colormaps'

export interface ModelOption {
	id: number
	name: string
	task_type: string
	accuracy: number | undefined
}

export function render_annotation_properties_panel(
	selected_ann_id: string | undefined,
	annotations: Annotation[],
	classes: ClassInfo[],
	_set_annotations: (fn: (prev: Annotation[]) => Annotation[]) => void,
	isDarkMode: boolean,
	text_muted: string,
	text_heading: string,
	border_subtle: string
): ReactNode {
	const ann = annotations.find((a) => a.id === selected_ann_id)
	if (!ann) return undefined

	const select_cls = `bg-transparent border rounded p-1 ${isDarkMode ? 'border-zinc-700 text-zinc-100 bg-zinc-900' : 'border-zinc-300 text-zinc-900 bg-white'} disabled:opacity-50`
	const dim_box_cls = `p-2 rounded border ${border_subtle} ${isDarkMode ? 'bg-zinc-900/50' : 'bg-white'}`

	return (
		<div className="space-y-3 text-xs">
			<div className="flex items-center justify-between">
				<span className={text_muted}>Class</span>
				<select
					value={ann.classId}
					onChange={(e) =>
						_set_annotations((prev) =>
							prev.map((a) => (a.id === selected_ann_id ? { ...a, classId: e.target.value } : a))
						)
					}
					className={select_cls}
				>
					{classes.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</select>
			</div>
			<div className="flex items-center justify-between">
				<span className={text_muted}>Status</span>
				<select
					value={ann.status || 'pending'}
					onChange={(e) =>
						_set_annotations((prev) =>
							prev.map((a) =>
								a.id === selected_ann_id
									? { ...a, status: e.target.value as 'pending' | 'approved' | 'needs_review' }
									: a
							)
						)
					}
					className={select_cls}
				>
					<option value="pending">Pending</option>
					<option value="needs_review">Needs Review</option>
					<option value="approved">Approved</option>
				</select>
			</div>
			<div className="grid grid-cols-2 gap-2 mt-2">
				<div className={dim_box_cls}>
					<div className={`text-[10px] ${text_muted} mb-1`}>X (px)</div>
					<div className={`font-mono ${text_heading}`}>{Math.round((ann.x / 100) * 800)}</div>
				</div>
				<div className={dim_box_cls}>
					<div className={`text-[10px] ${text_muted} mb-1`}>Y (px)</div>
					<div className={`font-mono ${text_heading}`}>{Math.round((ann.y / 100) * 600)}</div>
				</div>
				<div className={dim_box_cls}>
					<div className={`text-[10px] ${text_muted} mb-1`}>Width</div>
					<div className={`font-mono ${text_heading}`}>{Math.round((ann.w / 100) * 800)}</div>
				</div>
				<div className={dim_box_cls}>
					<div className={`text-[10px] ${text_muted} mb-1`}>Height</div>
					<div className={`font-mono ${text_heading}`}>{Math.round((ann.h / 100) * 600)}</div>
				</div>
			</div>
		</div>
	)
}

export function render_prediction_properties_panel(
	selected_prediction_id: string | undefined,
	predictions: Prediction[],
	classes: ClassInfo[],
	set_predictions: (fn: (prev: Prediction[]) => Prediction[]) => void,
	set_annotations: (fn: (prev: Annotation[]) => Annotation[]) => void,
	set_selected_prediction_id: (id: string | undefined) => void,
	set_selected_ann_id: (id: string | undefined) => void,
	isDarkMode: boolean,
	text_muted: string
): ReactNode {
	const pred = predictions.find((p) => p.id === selected_prediction_id)
	if (!pred) return undefined

	const select_cls = `bg-transparent border rounded p-1 ${isDarkMode ? 'border-zinc-700 text-zinc-100 bg-zinc-900' : 'border-zinc-300 text-zinc-900 bg-white'}`

	return (
		<div className="space-y-3 text-xs">
			<div className="flex items-center justify-between">
				<span className={text_muted}>Predicted Class</span>
				<select
					value={pred.classId}
					onChange={(e) =>
						set_predictions((prev) =>
							prev.map((p) =>
								p.id === selected_prediction_id ? { ...p, classId: e.target.value } : p
							)
						)
					}
					className={select_cls}
				>
					{classes.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</select>
			</div>
			<div className="flex items-center justify-between">
				<span className={text_muted}>Confidence</span>
				<span className="font-medium text-emerald-500">{Math.round(pred.confidence * 100)}%</span>
			</div>
			<div className="flex gap-2 pt-2">
				<button
					onClick={() => {
						const { ...ann_data } = pred
						set_annotations((prev) => [...prev, ann_data])
						set_predictions((prev) => prev.filter((p) => p.id !== pred.id))
						set_selected_prediction_id(undefined)
						set_selected_ann_id(ann_data.id)
					}}
					className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded flex items-center justify-center gap-1 font-medium transition-colors"
				>
					<CheckCircle2 size={14} /> Accept
				</button>
				<button
					onClick={() => {
						set_predictions((prev) => prev.filter((p) => p.id !== pred.id))
						set_selected_prediction_id(undefined)
					}}
					className="flex-1 bg-red-600 hover:bg-red-500 text-white py-1.5 rounded flex items-center justify-center gap-1 font-medium transition-colors"
				>
					<Trash2 size={14} /> Reject
				</button>
			</div>
		</div>
	)
}

export function render_image_properties_panel(
	annotations: Annotation[],
	predictions: Prediction[],
	is_showing_predictions: boolean,
	set_is_showing_predictions: (v: boolean) => void,
	text_muted: string,
	text_heading: string
) {
	return (
		<div className="space-y-3 text-xs">
			<div className="flex justify-between">
				<span className={text_muted}>Resolution</span>
				<span className={`font-medium ${text_heading}`}>1600 x 1200</span>
			</div>
			<div className="flex justify-between">
				<span className={text_muted}>Annotations</span>
				<span className={`font-medium ${text_heading}`}>{annotations.length}</span>
			</div>
			<div className="flex flex-col gap-1.5 py-1">
				<div className="flex justify-between items-center mb-1">
					<span className={text_muted}>AI Predictions</span>
					<button
						onClick={() => set_is_showing_predictions(!is_showing_predictions)}
						className={`text-xs px-2 py-0.5 rounded ${is_showing_predictions ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-500/20 text-zinc-400'}`}
					>
						{is_showing_predictions ? 'Hide' : 'Show'}
					</button>
				</div>
				<span className={`font-medium ${text_heading}`}>{predictions.length} pending</span>
			</div>
		</div>
	)
}

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
			className={`w-full flex items-center justify-between p-2 rounded-md hover:${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'} transition-colors group cursor-pointer border ${selected_ann_id === layer.id ? (isDarkMode ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white') : 'border-transparent'}`}
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
			className={`w-full flex items-center justify-between p-2 rounded-md hover:${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'} transition-colors group cursor-pointer border ${selected_prediction_id === layer.id ? (isDarkMode ? 'border-zinc-700 bg-zinc-800' : 'border-zinc-300 bg-white') : 'border-dashed border-zinc-500/30'}`}
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
				className={`flex items-center justify-between p-3 border-b ${border_subtle} hover:${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'} transition-colors w-full text-left`}
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

const PALETTE_LABELS: Record<PaletteName, string> = {
	grayscale: 'Grayscale',
	jet: 'Jet',
	hot: 'Hot',
	coolwarm: 'Coolwarm',
	viridis: 'Viridis',
	plasma: 'Plasma',
	inferno: 'Inferno',
	turbo: 'Turbo'
}

function render_palette_select(value: string, on_change: (v: string) => void, select_cls: string) {
	return (
		<select value={value} onChange={(e) => on_change(e.target.value)} className={select_cls}>
			{PALETTE_NAMES.map((name) => (
				<option key={name} value={name}>
					{PALETTE_LABELS[name]}
				</option>
			))}
		</select>
	)
}

export function render_satellite_layer_item(
	layer: CogLayerInfo,
	on_update: (id: string, patch: Partial<CogLayerInfo>) => void,
	on_remove: (id: string) => void,
	isDarkMode: boolean,
	text_heading: string,
	text_muted: string,
	border_subtle: string
) {
	const select_cls = `bg-transparent border rounded px-1 py-0.5 text-[10px] ${isDarkMode ? 'border-zinc-700 text-zinc-100' : 'border-zinc-300 text-zinc-900'}`
	const input_cls = `bg-transparent border rounded px-1 py-0.5 text-[10px] w-14 ${isDarkMode ? 'border-zinc-700 text-zinc-100' : 'border-zinc-300 text-zinc-900'}`

	return (
		<div
			key={layer.id}
			className={`p-2 rounded-md border ${border_subtle} ${isDarkMode ? 'bg-zinc-900/50' : 'bg-white'} space-y-2`}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 min-w-0">
					<button
						onClick={() => on_update(layer.id, { visible: !layer.visible })}
						className={`p-0.5 rounded ${layer.visible ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : text_muted}`}
					>
						{layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
					</button>
					<span className={`text-xs font-medium ${text_heading} truncate max-w-24`}>
						{layer.name}
					</span>
				</div>
				<button
					onClick={() => on_remove(layer.id)}
					className="p-0.5 text-red-500 hover:text-red-400 transition-colors"
				>
					<Trash2 size={12} />
				</button>
			</div>

			<div className="flex items-center gap-2">
				<span className={`text-[10px] ${text_muted} w-8`}>Opacity</span>
				<input
					type="range"
					min="0"
					max="100"
					value={layer.opacity}
					onChange={(e) => on_update(layer.id, { opacity: parseInt(e.target.value) })}
					className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
				/>
				<span className={`text-[10px] ${text_muted} w-6 text-right`}>{layer.opacity}%</span>
			</div>

			<div className="flex items-center gap-2">
				<span className={`text-[10px] ${text_muted} w-8`}>Band</span>
				<input
					type="number"
					min="0"
					value={layer.band}
					onChange={(e) =>
						on_update(layer.id, { band: Math.max(0, parseInt(e.target.value) || 0) })
					}
					className={input_cls}
				/>
				<span className={`text-[10px] ${text_muted} ml-1`}>Palette</span>
				{render_palette_select(
					layer.palette,
					(v) => on_update(layer.id, { palette: v as CogLayerInfo['palette'] }),
					`${select_cls} flex-1`
				)}
			</div>
		</div>
	)
}

export function render_bg_raster_controls(
	palette: string,
	on_palette_change: (v: string) => void,
	band: number,
	on_band_change: (v: number) => void,
	opacity: number,
	on_opacity_change: (v: number) => void,
	is_cog_project: boolean,
	isDarkMode: boolean,
	text_heading: string,
	text_muted: string,
	border_subtle: string
) {
	if (!is_cog_project) return undefined

	const select_cls = `bg-transparent border rounded px-1 py-0.5 text-[10px] ${isDarkMode ? 'border-zinc-700 text-zinc-100' : 'border-zinc-300 text-zinc-900'}`
	const input_cls = `bg-transparent border rounded px-1 py-0.5 text-[10px] w-14 ${isDarkMode ? 'border-zinc-700 text-zinc-100' : 'border-zinc-300 text-zinc-900'}`

	return (
		<div className={`p-3 border-b ${border_subtle} space-y-2`}>
			<h3 className={`text-sm font-semibold tracking-tight ${text_heading}`}>Raster Controls</h3>
			<div className="flex items-center gap-2">
				<span className={`text-[10px] ${text_muted} w-8`}>Opacity</span>
				<input
					type="range"
					min="0"
					max="100"
					value={opacity}
					onChange={(e) => on_opacity_change(parseInt(e.target.value))}
					className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
				/>
				<span className={`text-[10px] ${text_muted} w-6 text-right`}>{opacity}%</span>
			</div>
			<div className="flex items-center gap-2">
				<span className={`text-[10px] ${text_muted} w-8`}>Band</span>
				<input
					type="number"
					min="0"
					value={band}
					onChange={(e) => on_band_change(Math.max(0, parseInt(e.target.value) || 0))}
					className={input_cls}
				/>
				<span className={`text-[10px] ${text_muted} ml-1`}>Palette</span>
				{render_palette_select(palette, on_palette_change, `${select_cls} flex-1`)}
			</div>
		</div>
	)
}

export function render_satellite_layers_panel(
	cog_layers: CogLayerInfo[],
	on_update_layer: (id: string, patch: Partial<CogLayerInfo>) => void,
	on_remove_layer: (id: string) => void,
	on_add_layer: () => void,
	is_open: boolean,
	set_is_open: (v: boolean) => void,
	is_cog_project: boolean,
	isDarkMode: boolean,
	text_heading: string,
	text_muted: string,
	border_subtle: string,
	bg_hover: string
) {
	if (!is_cog_project) return undefined

	return (
		<div className="flex-1 flex flex-col min-h-0">
			<button
				onClick={() => set_is_open(!is_open)}
				className={`flex items-center justify-between p-3 border-b ${border_subtle} ${bg_hover} transition-colors w-full text-left`}
			>
				<div
					className={`flex items-center gap-2 text-sm font-semibold tracking-tight ${text_heading}`}
				>
					<Layers size={16} className={text_muted} /> Raster Layers
				</div>
				{is_open ? (
					<ChevronDown size={14} className={text_muted} />
				) : (
					<ChevronRight size={14} className={text_muted} />
				)}
			</button>

			{is_open && (
				<div className="flex-1 overflow-y-auto p-2 space-y-2">
					{cog_layers.map((layer) =>
						render_satellite_layer_item(
							layer,
							on_update_layer,
							on_remove_layer,
							isDarkMode,
							text_heading,
							text_muted,
							border_subtle
						)
					)}

					<button
						onClick={on_add_layer}
						className="w-full flex items-center justify-center gap-1 p-2 rounded-md border border-dashed border-zinc-600 hover:border-blue-500 text-xs text-zinc-400 hover:text-blue-400 transition-colors"
					>
						<Plus size={14} /> Add COG Layer
					</button>
				</div>
			)}
		</div>
	)
}

export function render_top_toolbar(
	undo: () => void,
	redo: () => void,
	history_step: number,
	history_length: number,
	show_prediction_btn: () => void,
	set_zoom_level: (fn: (prev: number) => number) => void,
	zoom_level: number,
	center_image: () => void,
	border_subtle: string,
	bg_panel: string,
	bg_hover: string,
	text_muted: string,
	text_heading: string,
	on_save?: () => void,
	is_saving?: boolean,
	save_message?: string,
	on_back?: () => void,
	on_prev?: () => void,
	on_next?: () => void,
	has_prev?: boolean,
	has_next?: boolean,
	file_name?: string,
	current_index?: number,
	total_images?: number,
	on_start_training?: () => void
) {
	return (
		<div
			className={`h-14 border-b ${border_subtle} ${bg_panel} flex items-center justify-between px-4 shrink-0 z-10 box-border`}
		>
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2">
					{on_back && (
						<button
							onClick={on_back}
							className={`p-1.5 rounded-md ${bg_hover} transition-colors ${text_muted} hover:${text_heading}`}
							title="Back to Datasets"
						>
							<ArrowLeft size={18} />
						</button>
					)}
					<button
						onClick={undo}
						disabled={history_step === 0}
						className={`p-1.5 rounded-md ${bg_hover} transition-colors ${text_muted} hover:${text_heading} disabled:opacity-50 disabled:cursor-not-allowed`}
						title="Undo (Ctrl+Z)"
					>
						<Undo size={18} />
					</button>
					<button
						onClick={redo}
						disabled={history_step === history_length - 1}
						className={`p-1.5 rounded-md ${bg_hover} transition-colors ${text_muted} hover:${text_heading} disabled:opacity-50 disabled:cursor-not-allowed`}
						title="Redo (Ctrl+Y)"
					>
						<Redo size={18} />
					</button>
					<div className={`w-px h-5 mx-1 ${border_subtle}`}></div>
					<button
						onClick={on_save}
						disabled={is_saving}
						className={`p-1.5 rounded-md ${bg_hover} transition-colors ${text_muted} hover:${text_heading} disabled:opacity-50`}
						title="Save (Ctrl+S)"
					>
						{is_saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
					</button>
					{save_message && (
						<span
							className={`text-xs font-medium ${save_message === 'Saved' ? 'text-emerald-500' : 'text-red-500'}`}
						>
							{save_message}
						</span>
					)}
					<div className={`w-px h-5 mx-1 ${border_subtle}`}></div>
					<button
						onClick={show_prediction_btn}
						className="px-3 py-1.5 rounded-md font-medium text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors"
						title="Simulate AI Prediction"
					>
						Auto-Detect
					</button>
				</div>
				<div className="flex items-center gap-3 ml-4">
					<button
						onClick={on_prev}
						disabled={!has_prev}
						className={`p-1.5 rounded-md border ${border_subtle} ${bg_hover} transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${has_prev ? `${text_muted} hover:${text_heading}` : text_muted}`}
					>
						<ChevronLeft size={16} />
					</button>
					<div className="flex flex-col min-w-0">
						<span className={`text-sm font-medium ${text_heading} truncate max-w-48`}>
							{file_name ?? 'No image selected'}
						</span>
						{total_images !== undefined && current_index !== undefined && (
							<span className={`text-[10px] ${text_muted}`}>
								Image {current_index + 1} of {total_images}
							</span>
						)}
					</div>
					<button
						onClick={on_next}
						disabled={!has_next}
						className={`p-1.5 rounded-md border ${border_subtle} ${bg_hover} transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${has_next ? `${text_muted} hover:${text_heading}` : text_muted}`}
					>
						<ChevronRight size={16} />
					</button>
				</div>
			</div>
			<div className="flex items-center gap-3">
				<div className={`flex items-center rounded-md border ${border_subtle} overflow-hidden h-8`}>
					<button
						onClick={() => set_zoom_level((z) => Math.max(z - 0.5, 0.5))}
						className={`px-2 h-full ${bg_hover} transition-colors ${text_muted} hover:${text_heading}`}
					>
						<ZoomOut size={16} />
					</button>
					<div
						className={`px-2 flex items-center justify-center font-medium text-xs w-14 border-x ${border_subtle} ${text_heading}`}
					>
						{Math.round(zoom_level * 100)}%
					</div>
					<button
						onClick={() => set_zoom_level((z) => Math.min(z + 0.5, 10))}
						className={`px-2 h-full ${bg_hover} transition-colors ${text_muted} hover:${text_heading}`}
					>
						<ZoomIn size={16} />
					</button>
				</div>
				<button
					onClick={center_image}
					className={`p-1.5 rounded-md border ${border_subtle} ${bg_hover} transition-colors ${text_muted} hover:${text_heading}`}
					title="Fit to Screen"
				>
					<Maximize size={16} />
				</button>
				<div className={`w-px h-5 mx-1 ${border_subtle}`}></div>
				<button
					onClick={on_start_training}
					className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 text-sm font-medium rounded-md hover:bg-emerald-600/20 transition-colors"
				>
					<CheckCircle2 size={16} /> Start Training
				</button>
			</div>
		</div>
	)
}

function item_bg(is_active: boolean, isDarkMode: boolean): string {
	if (is_active) return isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-blue-50 border-blue-200'
	if (isDarkMode) return 'border-transparent hover:bg-zinc-900 hover:border-zinc-800'
	return 'border-transparent hover:bg-zinc-100 hover:border-zinc-200'
}

function render_class_item(
	c: ClassInfo,
	idx: number,
	active_class: string,
	set_active_class: (id: string) => void,
	isDarkMode: boolean,
	border_subtle: string,
	text_heading: string,
	text_muted: string,
	delete_class_id: string | undefined,
	handle_delete_class: (id: string) => void,
	set_delete_class_id: (id: string | undefined) => void,
	renaming_class_id: string | undefined,
	handle_rename_class: (id: string, new_name: string) => void,
	set_renaming_class_id: (id: string | undefined) => void,
	theme_current_count_fn: (id: string, annotations: Annotation[]) => number,
	annotations: Annotation[]
) {
	const is_renaming = renaming_class_id === c.id
	const shortcut = idx < 9 ? idx + 1 : undefined
	const is_active = active_class === c.id
	const bg_cls = item_bg(is_active, isDarkMode)

	if (delete_class_id === c.id) {
		return (
			<div key={c.id} className={`w-full rounded-md transition-all border ${bg_cls}`}>
				<div className={`p-2 space-y-2 ${isDarkMode ? 'bg-red-950/30' : 'bg-red-50'} rounded-md`}>
					<p className={`text-[11px] ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
						Delete "{c.name}"? Annotations will become unassigned.
					</p>
					<div className="flex gap-2">
						<button
							onClick={() => handle_delete_class(c.id)}
							className="flex-1 px-2 py-1 text-[10px] rounded bg-red-600 text-white hover:bg-red-500 transition-colors font-medium"
						>
							Delete
						</button>
						<button
							onClick={() => set_delete_class_id(undefined)}
							className={`flex-1 px-2 py-1 text-[10px] rounded border ${border_subtle} ${text_muted} ${isDarkMode ? 'hover:text-zinc-100' : 'hover:text-zinc-900'} transition-colors`}
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		)
	}

	if (is_renaming) {
		return (
			<div key={c.id} className={`w-full rounded-md transition-all border ${bg_cls}`}>
				<div className="flex items-center gap-1 p-2">
					<input
						autoFocus
						type="text"
						defaultValue={c.name}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && e.currentTarget.value.trim()) {
								handle_rename_class(c.id, e.currentTarget.value.trim())
							}
							if (e.key === 'Escape') set_renaming_class_id(undefined)
						}}
						onBlur={(e) => {
							if (e.currentTarget.value.trim()) {
								handle_rename_class(c.id, e.currentTarget.value.trim())
							} else {
								set_renaming_class_id(undefined)
							}
						}}
						className={`flex-1 bg-transparent border rounded px-2 py-1 text-xs outline-none ${isDarkMode ? 'border-zinc-700 text-zinc-100' : 'border-zinc-300 text-zinc-900'} ${text_heading}`}
					/>
					<button
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => {
							const el = document.activeElement as HTMLInputElement | null
							if (el?.value?.trim()) handle_rename_class(c.id, el.value.trim())
							else set_renaming_class_id(undefined)
						}}
						className="p-1 hover:text-blue-500 transition-colors"
					>
						<Check size={14} />
					</button>
				</div>
			</div>
		)
	}

	return (
		<div key={c.id} className={`group w-full rounded-md transition-all border ${bg_cls}`}>
			<div className="flex items-center justify-between p-2">
				<button
					onClick={() => set_active_class(c.id)}
					className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
				>
					{shortcut !== undefined && (
						<kbd
							className={`text-[10px] font-mono px-1 py-0.5 rounded ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-500'}`}
						>
							{shortcut}
						</kbd>
					)}
					<div
						className={`w-3 h-3 rounded-[3px] border ${isDarkMode ? 'border-white/20' : 'border-black/10'} shadow-sm flex items-center justify-center shrink-0`}
						style={{ backgroundColor: c.color }}
					>
						{is_active && <div className="w-1 h-1 bg-white rounded-full"></div>}
					</div>
					<span className={`text-sm ${is_active ? text_heading : text_muted} font-medium truncate`}>
						{c.name}
					</span>
				</button>
				<div className="flex items-center gap-1 shrink-0">
					<span
						className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-zinc-900 text-zinc-500' : 'bg-white text-zinc-400'}`}
					>
						{theme_current_count_fn(c.id, annotations)}
					</span>
					<button
						onClick={(e) => {
							e.stopPropagation()
							set_renaming_class_id(c.id)
						}}
						className={`p-1 rounded opacity-0 group-hover:opacity-100 ${isDarkMode ? 'hover:text-zinc-100' : 'hover:text-zinc-900'} ${text_muted} transition-all`}
						title="Rename"
					>
						<Pencil size={12} />
					</button>
					<button
						onClick={(e) => {
							e.stopPropagation()
							set_delete_class_id(c.id)
						}}
						className={`p-1 rounded opacity-0 group-hover:opacity-100 hover:text-red-500 ${text_muted} transition-all`}
						title="Delete"
					>
						<Trash2 size={12} />
					</button>
				</div>
			</div>
		</div>
	)
}

export function render_left_panel(
	left_width: number,
	border_subtle: string,
	bg_panel: string,
	tools: readonly { id: Mode; icon: React.ComponentType<LucideProps>; label: string }[],
	active_tool: string,
	set_active_tool: (tool: Mode) => void,
	isDarkMode: boolean,
	brush_size: number,
	set_brush_size: (size: number) => void,
	brush_opacity: number,
	set_brush_opacity: (opacity: number) => void,
	is_classes_open: boolean,
	set_is_classes_open: (open: boolean) => void,
	text_heading: string,
	text_muted: string,
	bg_hover: string,
	classes: ClassInfo[],
	active_class: string,
	set_active_class: (cls: string) => void,
	annotations: Annotation[],
	is_dragging_left: React.MutableRefObject<boolean>,
	theme_current_count_fn: (id: string, annotations: Annotation[]) => number,
	handle_create_class: (name: string, color?: string) => void,
	handle_rename_class: (id: string, new_name: string) => void,
	handle_delete_class: (id: string) => void,
	renaming_class_id: string | undefined,
	set_renaming_class_id: (id: string | undefined) => void,
	delete_class_id: string | undefined,
	set_delete_class_id: (id: string | undefined) => void,
	new_class_name: string,
	set_new_class_name: (name: string) => void
) {
	const input_ref = useRef<HTMLInputElement>(undefined!)

	const on_create = () => {
		const name = new_class_name.trim()
		if (name) {
			handle_create_class(name)
			set_new_class_name('')
		}
	}

	return (
		<div
			style={{ width: left_width }}
			className={`shrink-0 border-r ${border_subtle} ${bg_panel} flex flex-col z-10 relative`}
		>
			<div className={`p-3 border-b ${border_subtle} flex flex-wrap gap-2`}>
				{tools.map((tool) => (
					<button
						key={tool.id}
						onClick={() => set_active_tool(tool.id)}
						title={tool.label}
						className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${active_tool === tool.id ? 'bg-blue-600 text-white shadow-sm' : `${bg_hover} ${text_muted} ${isDarkMode ? 'hover:text-zinc-100' : 'hover:text-zinc-900'}`}`}
					>
						<tool.icon size={18} />
					</button>
				))}
			</div>
			{(active_tool === 'brush' || active_tool === 'eraser') && (
				<div className={`p-4 border-b ${border_subtle} space-y-4`}>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label className={`text-xs font-semibold ${text_heading}`}>Brush Size</label>
							<span className={`text-xs ${text_muted}`}>{brush_size}px</span>
						</div>
						<input
							type="range"
							min="1"
							max="100"
							value={brush_size}
							onChange={(e) => set_brush_size(parseInt(e.target.value))}
							className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
						/>
					</div>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label className={`text-xs font-semibold ${text_heading}`}>Mask Opacity</label>
							<span className={`text-xs ${text_muted}`}>{brush_opacity}%</span>
						</div>
						<input
							type="range"
							min="0"
							max="100"
							value={brush_opacity}
							onChange={(e) => set_brush_opacity(parseInt(e.target.value))}
							className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
						/>
					</div>
				</div>
			)}
			<div className="flex-1 flex flex-col min-h-0">
				<button
					onClick={() => set_is_classes_open(!is_classes_open)}
					className={`flex items-center justify-between p-3 border-b ${border_subtle} ${isDarkMode ? 'hover:bg-zinc-900' : 'hover:bg-zinc-100'} transition-colors w-full text-left`}
				>
					<div
						className={`flex items-center gap-2 text-sm font-semibold tracking-tight ${text_heading}`}
					>
						<Hash size={16} className={text_muted} /> Classes
					</div>
					{is_classes_open ? (
						<ChevronDown size={14} className={text_muted} />
					) : (
						<ChevronRight size={14} className={text_muted} />
					)}
				</button>
				{is_classes_open && (
					<div className="flex-1 overflow-y-auto p-2 space-y-1">
						<div className="px-2 pb-2">
							<div
								className={`flex items-center px-2 py-1.5 rounded border ${border_subtle} ${isDarkMode ? 'bg-zinc-900' : 'bg-white'}`}
							>
								<Plus size={14} className={text_muted} />
								<input
									ref={input_ref}
									type="text"
									placeholder="Add class..."
									value={new_class_name}
									onChange={(e) => set_new_class_name(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') on_create()
									}}
									className={`bg-transparent outline-none text-xs ml-2 w-full ${text_heading}`}
								/>
								{new_class_name.trim() && (
									<button
										onClick={on_create}
										className="p-0.5 hover:text-blue-500 transition-colors"
									>
										<Check size={14} />
									</button>
								)}
							</div>
						</div>
						{classes.map((c, idx) =>
							render_class_item(
								c,
								idx,
								active_class,
								set_active_class,
								isDarkMode,
								border_subtle,
								text_heading,
								text_muted,
								delete_class_id,
								handle_delete_class,
								set_delete_class_id,
								renaming_class_id,
								handle_rename_class,
								set_renaming_class_id,
								theme_current_count_fn,
								annotations
							)
						)}
					</div>
				)}
			</div>
			<div
				className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-20"
				onMouseDown={() => {
					is_dragging_left.current = true
					document.body.style.cursor = 'col-resize'
				}}
			/>
		</div>
	)
}

export function render_model_selection_dialog(
	is_open: boolean,
	custom_models: ModelOption[],
	selected_model_id: number | undefined,
	set_selected_model_id: (id: number | undefined) => void,
	on_confirm: () => void,
	on_cancel: () => void,
	is_running: boolean,
	text_muted: string,
	text_heading: string,
	bg_panel: string,
	border_subtle: string,
	bg_hover: string
) {
	if (!is_open) return undefined

	return (
		<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
			<div
				className={`rounded-lg shadow-xl border ${border_subtle} ${bg_panel} w-full max-w-md p-6`}
			>
				<h2 className={`text-lg font-semibold mb-4 ${text_heading}`}>
					Select Model for Auto Detection
				</h2>

				<label
					className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
						selected_model_id === -1 ? 'border-indigo-500 bg-indigo-50/10' : border_subtle
					} ${bg_hover}`}
				>
					<input
						type="radio"
						name="model"
						checked={selected_model_id === -1}
						onChange={() => set_selected_model_id(-1)}
						className="accent-indigo-500"
					/>
					<div>
						<div className={`text-sm font-medium ${text_heading}`}>SAM 2</div>
						<div className={`text-xs ${text_muted}`}>Segment Anything Model 2.1</div>
					</div>
				</label>

				<label
					className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
						selected_model_id === undefined ? 'border-indigo-500 bg-indigo-50/10' : border_subtle
					} ${bg_hover}`}
				>
					<input
						type="radio"
						name="model"
						checked={selected_model_id === undefined}
						onChange={() => set_selected_model_id(undefined)}
						className="accent-indigo-500"
					/>
					<div>
						<div className={`text-sm font-medium ${text_heading}`}>Default Model</div>
						<div className={`text-xs ${text_muted}`}>YOLO11n COCO Pretrained</div>
					</div>
				</label>

				<div className="mt-3">
					<div className={`text-sm font-medium mb-2 ${text_heading}`}>Custom Models</div>
					{custom_models.length === 0 ? (
						<p className={`text-xs ${text_muted} italic p-2`}>
							No trained models available. Using Default YOLO11n COCO Model.
						</p>
					) : (
						<div className="space-y-2">
							{custom_models.map((model) => (
								<label
									key={model.id}
									className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
										selected_model_id === model.id
											? 'border-indigo-500 bg-indigo-50/10'
											: border_subtle
									} ${bg_hover}`}
								>
									<input
										type="radio"
										name="model"
										checked={selected_model_id === model.id}
										onChange={() => set_selected_model_id(model.id)}
										className="accent-indigo-500"
									/>
									<div>
										<div className={`text-sm font-medium ${text_heading}`}>{model.name}</div>
										<div className={`text-xs ${text_muted}`}>
											{model.task_type}
											{model.accuracy !== undefined
												? ` • Acc: ${(model.accuracy * 100).toFixed(1)}%`
												: ''}
										</div>
									</div>
								</label>
							))}
						</div>
					)}
				</div>

				<div className="flex justify-end gap-3 mt-6">
					<button
						onClick={on_cancel}
						disabled={is_running}
						className={`px-4 py-2 rounded-md text-sm font-medium border ${border_subtle} ${text_muted} ${bg_hover} transition-colors disabled:opacity-50`}
					>
						Cancel
					</button>
					<button
						onClick={on_confirm}
						disabled={is_running}
						className="px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
					>
						{is_running ? (
							<>
								<Loader2 size={16} className="animate-spin" />
								Running...
							</>
						) : (
							'Run Detection'
						)}
					</button>
				</div>
			</div>
		</div>
	)
}
