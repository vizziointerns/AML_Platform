import type { Annotation, Prediction, ClassInfo } from './types'
import {
	render_annotation_properties_panel,
	render_prediction_properties_panel,
	render_image_properties_panel
} from './render'

export function render_right_properties_panel(
	is_cog_project: boolean,
	selected_ann_id: string | undefined,
	selected_prediction_id: string | undefined,
	annotations: Annotation[],
	classes: ClassInfo[],
	set_annotations: (fn: (prev: Annotation[]) => Annotation[]) => void,
	isDarkMode: boolean,
	text_muted: string,
	text_heading: string,
	border_subtle: string,
	predictions: Prediction[],
	set_predictions: (fn: (prev: Prediction[]) => Prediction[]) => void,
	set_selected_prediction_id: (id: string | undefined) => void,
	set_selected_ann_id: (id: string | undefined) => void,
	is_showing_predictions: boolean,
	set_is_showing_predictions: (v: boolean) => void
) {
	if (is_cog_project) return undefined
	const properties_title = selected_ann_id
		? 'Annotation Properties'
		: selected_prediction_id
			? 'Prediction Properties'
			: 'Image Properties'
	return (
		<div className={`p-4 border-b ${border_subtle}`}>
			<h3 className={`text-sm font-semibold tracking-tight mb-3 ${text_heading}`}>
				{properties_title}
			</h3>
			{render_properties_content(
				selected_ann_id,
				annotations,
				classes,
				set_annotations,
				isDarkMode,
				text_muted,
				text_heading,
				border_subtle,
				selected_prediction_id,
				predictions,
				set_predictions,
				set_selected_prediction_id,
				set_selected_ann_id,
				is_showing_predictions,
				set_is_showing_predictions
			)}
		</div>
	)
}

function render_properties_content(
	selected_ann_id: string | undefined,
	annotations: Annotation[],
	classes: ClassInfo[],
	set_annotations: (fn: (prev: Annotation[]) => Annotation[]) => void,
	isDarkMode: boolean,
	text_muted: string,
	text_heading: string,
	border_subtle: string,
	selected_prediction_id: string | undefined,
	predictions: Prediction[],
	set_predictions: (fn: (prev: Prediction[]) => Prediction[]) => void,
	set_selected_prediction_id: (id: string | undefined) => void,
	set_selected_ann_id: (id: string | undefined) => void,
	is_showing_predictions: boolean,
	set_is_showing_predictions: (v: boolean) => void
) {
	if (selected_ann_id) {
		return render_annotation_properties_panel(
			selected_ann_id,
			annotations,
			classes,
			set_annotations,
			isDarkMode,
			text_muted,
			text_heading,
			border_subtle
		)
	}
	if (selected_prediction_id) {
		return render_prediction_properties_panel(
			selected_prediction_id,
			predictions,
			classes,
			set_predictions,
			set_annotations,
			set_selected_prediction_id,
			set_selected_ann_id,
			isDarkMode,
			text_muted
		)
	}
	return render_image_properties_panel(
		annotations,
		predictions,
		is_showing_predictions,
		set_is_showing_predictions,
		text_muted,
		text_heading
	)
}
