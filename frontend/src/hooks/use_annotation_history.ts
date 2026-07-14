import { useState, useCallback } from 'react'
import { save_annotations } from '../api/annotations'
import type { Annotation, Prediction } from '../pages/projects/pages/annotation/types'

export function use_annotation_history() {
	const [history, set_history] = useState<Annotation[][]>([[]])
	const [history_step, set_history_step] = useState(0)
	const [predictions, set_predictions] = useState<Prediction[]>([])
	const [is_showing_predictions, set_is_showing_predictions] = useState(false)
	const [selected_prediction_id, set_selected_prediction_id] = useState<string | undefined>(
		undefined
	)
	const [is_saving, set_is_saving] = useState(false)
	const [save_message, set_save_message] = useState<string | undefined>(undefined)

	const annotations = history[history_step] ?? []

	const set_annotations = useCallback(
		(new_annotations_or_updater: Annotation[] | ((prev: Annotation[]) => Annotation[])) => {
			set_history((prev) => {
				const current = prev[history_step]
				const new_annotations =
					typeof new_annotations_or_updater === 'function'
						? new_annotations_or_updater(current ?? [])
						: new_annotations_or_updater

				if (current === new_annotations) return prev

				const new_history = prev.slice(0, history_step + 1)
				new_history.push(new_annotations)
				if (new_history.length > 50) new_history.shift()
				return new_history
			})
			set_history_step((prev) => Math.min(prev + 1, 49))
		},
		[history_step]
	)

	const undo = useCallback(() => {
		set_history_step((prev) => Math.max(0, prev - 1))
	}, [])

	const redo = useCallback(() => {
		set_history_step((prev) => Math.min(history.length - 1, prev + 1))
	}, [history.length])

	const handle_save = useCallback(
		async (imageId: string | undefined) => {
			if (!imageId || is_saving) return
			set_is_saving(true)
			set_save_message(undefined)
			try {
				const preds_as_annotations = predictions as Annotation[]
				const all_annotations = [...annotations, ...preds_as_annotations]
				await save_annotations(imageId, all_annotations)
				if (preds_as_annotations.length > 0) {
					set_history((prev) => {
						const updated = [...(prev[history_step] ?? []), ...preds_as_annotations]
						const copy = [...prev]
						copy[history_step] = updated
						return copy
					})
					set_predictions([])
					set_is_showing_predictions(false)
					set_selected_prediction_id(undefined)
				}
				set_save_message('Saved')
				setTimeout(() => set_save_message(undefined), 2000)
			} catch {
				console.error('Failed to save annotations')
				set_save_message('Save failed')
				setTimeout(() => set_save_message(undefined), 3000)
			} finally {
				set_is_saving(false)
			}
		},
		[annotations, predictions, is_saving, history_step]
	)

	return {
		history,
		set_history,
		history_step,
		set_history_step,
		annotations,
		predictions,
		set_predictions,
		is_showing_predictions,
		set_is_showing_predictions,
		selected_prediction_id,
		set_selected_prediction_id,
		is_saving,
		save_message,
		set_annotations,
		undo,
		redo,
		handle_save
	}
}
