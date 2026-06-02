import { type ReactNode } from 'react'
import {
	Square,
	Hexagon,
	Pencil,
	ZoomIn,
	ZoomOut,
	Maximize,
	Trash2,
	Save,
	Undo,
	Redo,
	Hash,
	MessageSquare,
	Lock,
	CheckCircle2,
	ChevronRight,
	ChevronDown,
	Plus,
	ChevronLeft,
	ListTree,
	type LucideProps
} from 'lucide-react'
import type { Annotation, Collaborator, Prediction, ClassInfo, LayerActionSet, Mode } from './types'

export function render_comments_section(
	ann: Annotation,
	selected_ann_id: string | undefined,
	collaborators: Collaborator[],
	set_annotations: (fn: (prev: Annotation[]) => Annotation[]) => void,
	isDarkMode: boolean,
	text_heading: string
) {
	const input_cls = `flex-1 min-w-0 bg-transparent border rounded px-2 py-1.5 text-[11px] ${isDarkMode ? 'border-zinc-700 text-zinc-100 focus:border-zinc-500' : 'border-zinc-300 text-zinc-900 focus:border-zinc-400'} outline-none`

	return (
		<div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
			<div className={`font-semibold mb-2 flex justify-between items-center ${text_heading}`}>
				<span>Comments</span>
				<span
					className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
				>
					{ann.comments?.length || 0}
				</span>
			</div>
			<div className="space-y-2 mb-2 max-h-32 overflow-y-auto pr-1">
				{ann.comments?.map((comment) => {
					const author = collaborators.find((c) => c.id === comment.userId) || {
						name: 'You',
						color: '#6366f1'
					}
					return (
						<div key={comment.id} className="bg-zinc-100 dark:bg-zinc-800 rounded p-2 text-[11px]">
							<div className="flex items-center justify-between mb-1">
								<span className="font-semibold" style={{ color: author.color }}>
									{author.name}
								</span>
								<span className="text-zinc-400 text-[9px]">
									{new Date(comment.timestamp).toLocaleTimeString([], {
										hour: '2-digit',
										minute: '2-digit'
									})}
								</span>
							</div>
							<div className="text-zinc-600 dark:text-zinc-300 leading-tight">{comment.text}</div>
						</div>
					)
				})}
				{(!ann.comments || ann.comments.length === 0) && (
					<div className="text-zinc-400 text-[10px] text-center py-2">No comments yet.</div>
				)}
			</div>
			<div className="flex gap-2">
				<input
					type="text"
					placeholder="Add a comment..."
					className={input_cls}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && e.currentTarget.value.trim()) {
							const val = e.currentTarget.value.trim()
							e.currentTarget.value = ''
							set_annotations((prev) =>
								prev.map((a) => {
									if (a.id === selected_ann_id) {
										return {
											...a,
											comments: [
												...(a.comments || []),
												{
													id: Math.random().toString(),
													userId: 'local',
													text: val,
													timestamp: Date.now()
												}
											]
										}
									}
									return a
								})
							)
						}
					}}
				/>
			</div>
		</div>
	)
}

export function render_annotation_properties_panel(
	selected_ann_id: string | undefined,
	annotations: Annotation[],
	classes: ClassInfo[],
	collaborators: Collaborator[],
	set_annotations: (fn: (prev: Annotation[]) => Annotation[]) => void,
	isDarkMode: boolean,
	text_muted: string,
	text_heading: string,
	border_subtle: string
): ReactNode {
	const ann = annotations.find((a) => a.id === selected_ann_id)
	if (!ann) return undefined

	const locked_user = collaborators.find((c) => c.id === ann.lockedBy)
	const select_cls = `bg-transparent border rounded p-1 ${isDarkMode ? 'border-zinc-700 text-zinc-100 bg-zinc-900' : 'border-zinc-300 text-zinc-900 bg-white'} disabled:opacity-50`
	const dim_box_cls = `p-2 rounded border ${border_subtle} ${isDarkMode ? 'bg-zinc-900/50' : 'bg-white'}`

	return (
		<div className="space-y-3 text-xs">
			{locked_user && (
				<div
					className={`p-2 rounded-md ${isDarkMode ? 'bg-amber-900/20 text-amber-400 border border-amber-900/30' : 'bg-amber-50 text-amber-600 border border-amber-100'} flex items-start gap-2`}
				>
					<Lock size={14} className="mt-0.5 shrink-0" />
					<div>
						<span className="font-semibold">{locked_user.name}</span> is currently editing.
					</div>
				</div>
			)}
			<div className="flex items-center justify-between">
				<span className={text_muted}>Class</span>
				<select
					value={ann.classId}
					disabled={!!locked_user}
					onChange={(e) =>
						set_annotations((prev) =>
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
					disabled={!!locked_user}
					onChange={(e) =>
						set_annotations((prev) =>
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
			{render_comments_section(
				ann,
				selected_ann_id,
				collaborators,
				set_annotations,
				isDarkMode,
				text_heading
			)}
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
	collaborators: Collaborator[],
	actions: LayerActionSet,
	isDarkMode: boolean,
	text_heading: string
) {
	const layer_color = get_class_color(layer.classId)
	const locked_user = collaborators.find((c) => c.id === layer.lockedBy)
	const has_comments = layer.comments && layer.comments.length > 0
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
				{has_comments && (
					<span title={`${layer.comments?.length} comments`}>
						<MessageSquare size={12} className="text-blue-500" />
					</span>
				)}
				{layer.status && (
					<span title={`Status: ${layer.status}`}>
						<CheckCircle2 size={12} className={status_color} />
					</span>
				)}
				{locked_user && (
					<div
						className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
						style={{ backgroundColor: locked_user.color }}
						title={`Locked by ${locked_user.name}`}
					>
						{locked_user.name.charAt(0)}
					</div>
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
	collaborators: Collaborator[],
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
							collaborators,
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

export function render_top_toolbar(
	undo: () => void,
	redo: () => void,
	history_step: number,
	history_length: number,
	show_prediction_btn: () => void,
	collaborators: Collaborator[],
	isDarkMode: boolean,
	set_zoom_level: (fn: (prev: number) => number) => void,
	zoom_level: number,
	center_image: () => void,
	border_subtle: string,
	bg_panel: string,
	bg_hover: string,
	text_muted: string,
	text_heading: string
) {
	return (
		<div
			className={`h-14 border-b ${border_subtle} ${bg_panel} flex items-center justify-between px-4 shrink-0 z-10 box-border`}
		>
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2">
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
						className={`p-1.5 rounded-md ${bg_hover} transition-colors ${text_muted} hover:${text_heading}`}
						title="Save (Ctrl+S)"
					>
						<Save size={18} />
					</button>
					<div className={`w-px h-5 mx-1 ${border_subtle}`}></div>
					<button
						onClick={show_prediction_btn}
						className="px-3 py-1.5 rounded-md font-medium text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors"
						title="Simulate AI Prediction"
					>
						Auto-Detect
					</button>
					<div className={`w-px h-5 mx-2 ${border_subtle}`}></div>
					<div className="flex -space-x-2">
						{collaborators.map((c) => (
							<div
								key={c.id}
								className="w-7 h-7 rounded-full border-2 bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-transparent hover:z-10 transition-transform cursor-pointer"
								style={{ backgroundColor: c.color, borderColor: isDarkMode ? '#18181b' : '#fff' }}
								title={`${c.name} (Online)`}
							>
								{c.name.charAt(0)}
							</div>
						))}
						<div
							className="w-7 h-7 rounded-full border-2 border-dashed border-zinc-400 bg-transparent flex items-center justify-center text-zinc-400 cursor-pointer hover:text-zinc-500 hover:border-zinc-500 transition-colors"
							title="Invite Collaborators"
							style={{ borderColor: isDarkMode ? '#3f3f46' : '#d4d4d8' }}
						>
							<Plus size={14} />
						</div>
					</div>
				</div>
				<div className="flex items-center gap-3 ml-4">
					<button
						className={`p-1.5 rounded-md border ${border_subtle} ${bg_hover} transition-colors ${text_muted} hover:${text_heading}`}
					>
						<ChevronLeft size={16} />
					</button>
					<div className="flex flex-col">
						<span className={`text-sm font-medium ${text_heading}`}>IMG_2023_09_14_421.png</span>
						<span className={`text-[10px] ${text_muted}`}>1024 / 4500 (22% complete)</span>
					</div>
					<button
						className={`p-1.5 rounded-md border ${border_subtle} ${bg_hover} transition-colors ${text_muted} hover:${text_heading}`}
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
				<button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 text-sm font-medium rounded-md hover:bg-emerald-600/20 transition-colors">
					<CheckCircle2 size={16} /> Submit
				</button>
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
	theme_current_count_fn: (id: string, annotations: Annotation[]) => number
) {
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
						className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${active_tool === tool.id ? 'bg-blue-600 text-white shadow-sm' : `${bg_hover} ${text_muted} hover:${text_heading}`}`}
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
					className={`flex items-center justify-between p-3 border-b ${border_subtle} hover:${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'} transition-colors w-full text-left`}
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
									type="text"
									placeholder="Add class..."
									className={`bg-transparent outline-none text-xs ml-2 w-full ${text_heading}`}
								/>
							</div>
						</div>
						{classes.map((c) => (
							<button
								key={c.id}
								onClick={() => set_active_class(c.id)}
								className={`w-full flex items-center justify-between p-2 rounded-md transition-all border ${active_class === c.id ? (isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-blue-50 border-blue-200') : `border-transparent hover:${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}`}
							>
								<div className="flex items-center gap-2.5">
									<div
										className={`w-3 h-3 rounded-[3px] border ${isDarkMode ? 'border-white/20' : 'border-black/10'} shadow-sm flex items-center justify-center`}
										style={{ backgroundColor: c.color }}
									>
										{active_class === c.id && <div className="w-1 h-1 bg-white rounded-full"></div>}
									</div>
									<span
										className={`text-sm ${active_class === c.id ? text_heading : text_muted} font-medium`}
									>
										{c.name}
									</span>
								</div>
								<span
									className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-zinc-900 text-zinc-500' : 'bg-white text-zinc-400'}`}
								>
									{theme_current_count_fn(c.id, annotations)}
								</span>
							</button>
						))}
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
