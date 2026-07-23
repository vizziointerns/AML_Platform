import { type ReactNode } from 'react'
import { Trash2, CheckCircle2 } from 'lucide-react'
import type { Annotation, Prediction, ClassInfo } from './types'

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
