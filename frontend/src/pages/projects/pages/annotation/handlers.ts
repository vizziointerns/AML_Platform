import type { Annotation, Prediction, Mode, ClassInfo } from './types'
import { run_segmentation, run_auto_segmentation } from '../../../../api/segment'
import { run_inference } from '../../../../api/inference'
import { supabase } from '../../../../utils/supabase'
import {
	class_create,
	handle_mode_shortcut,
	handle_brush_size_shortcut,
	handle_zoom_level_shortcut,
	handle_delete_shortcut,
	handle_class_shortcut,
	handle_undo_redo_shortcut
} from './utils'

export async function save_image_class_labels(
	imageId: string,
	class_ids: string[],
	dataset_id?: string
) {
	const { error } = await supabase.rpc('update_image_class_labels', {
		p_image_id: imageId,
		p_class_labels: class_ids
	})
	if (error) throw error

	let ds_id = dataset_id
	if (!ds_id) {
		const { data: img_row, error: img_err } = await supabase
			.from('dataset_images')
			.select('dataset_id')
			.eq('id', imageId)
			.maybeSingle()
		if (img_err) throw img_err
		if (!img_row?.dataset_id) throw new Error('Dataset not found for image')
		ds_id = img_row.dataset_id
	}

	const { data: all_images, error: query_err } = await supabase
		.from('dataset_images')
		.select('class_labels')
		.eq('dataset_id', ds_id)
	if (query_err) throw query_err
	if (!all_images) throw new Error('Failed to load dataset images')

	const is_all_annotated = all_images.every((img) => (img.class_labels?.length ?? 0) > 0)
	const { error: update_err } = await supabase
		.from('datasets')
		.update({ status: is_all_annotated ? 'Completed' : 'Processing' })
		.eq('id', ds_id)
	if (update_err) throw update_err
}

export function handle_segment_click(
	image_url: string,
	pos: { x: number; y: number },
	image: HTMLImageElement,
	selected_prediction_id: string | undefined,
	predictions: Prediction[],
	active_class: string,
	set_annotations: (fn: (prev: Annotation[]) => Annotation[]) => void,
	set_selected_ann_id: (id: string | undefined) => void,
	set_active_tool: (mode: Mode) => void,
	set_is_running_segmentation: (v: boolean) => void,
	is_current_image: () => boolean
) {
	set_is_running_segmentation(true)

	const img_w = image.naturalWidth
	const img_h = image.naturalHeight
	const selected_pred = predictions.find((p) => p.id === selected_prediction_id)
	const assigned_class = selected_pred ? selected_pred.classId : active_class

	const prompt_type = selected_pred ? 'box' : 'point'
	const prompt_data: number[] = selected_pred
		? [
				(selected_pred.x / 100) * img_w,
				(selected_pred.y / 100) * img_h,
				((selected_pred.x + selected_pred.w) / 100) * img_w,
				((selected_pred.y + selected_pred.h) / 100) * img_h
			]
		: [pos.x, pos.y]

	run_segmentation(image_url, prompt_type, prompt_data)
		.then((polygons) => {
			if (!is_current_image()) return
			const new_annotations: Annotation[] = polygons.map((poly) => {
				const xs = poly.points.map((p) => p.x)
				const ys = poly.points.map((p) => p.y)
				return {
					id: 'seg_' + Math.random().toString(36).substr(2, 9),
					type: 'polygon' as const,
					classId: assigned_class,
					x: Math.round(Math.min(...xs) * 100) / 100,
					y: Math.round(Math.min(...ys) * 100) / 100,
					w: Math.round((Math.max(...xs) - Math.min(...xs)) * 100) / 100,
					h: Math.round((Math.max(...ys) - Math.min(...ys)) * 100) / 100,
					points: poly.points
				}
			})
			if (new_annotations.length > 0) {
				const first = new_annotations[0]!
				set_annotations((prev) => [...prev, ...new_annotations])
				set_selected_ann_id(first.id)
				set_active_tool('select')
			}
		})
		.catch((err) => console.error('Segmentation failed:', err))
		.finally(() => set_is_running_segmentation(false))
}

export function handle_sam_auto_segment(
	image_url: string,
	active_class: string,
	set_is_running_segmentation: (v: boolean) => void,
	set_is_model_selector_open: (v: boolean) => void,
	set_annotations: (fn: (prev: Annotation[]) => Annotation[]) => void,
	set_selected_ann_id: (id: string | undefined) => void,
	set_active_tool: (mode: Mode) => void,
	is_current_image: () => boolean,
	model_version: string = 'sam2.1',
	class_name?: string
) {
	set_is_running_segmentation(true)
	set_is_model_selector_open(false)
	run_auto_segmentation(image_url, class_name ?? active_class, model_version)
		.then((polygons) => {
			if (!is_current_image()) return
			const new_annotations: Annotation[] = polygons.map((poly) => {
				const xs = poly.points.map((p) => p.x)
				const ys = poly.points.map((p) => p.y)
				return {
					id: 'seg_' + Math.random().toString(36).substr(2, 9),
					type: 'polygon' as const,
					classId: active_class,
					x: Math.round(Math.min(...xs) * 100) / 100,
					y: Math.round(Math.min(...ys) * 100) / 100,
					w: Math.round((Math.max(...xs) - Math.min(...xs)) * 100) / 100,
					h: Math.round((Math.max(...ys) - Math.min(...ys)) * 100) / 100,
					points: poly.points
				}
			})
			if (new_annotations.length > 0) {
				set_annotations((prev) => [...prev, ...new_annotations])
				set_selected_ann_id(new_annotations[0]!.id)
				set_active_tool('select')
			}
		})
		.catch((err) => console.error('Auto segmentation failed:', err))
		.finally(() => set_is_running_segmentation(false))
}

export function run_inference_handler(
	api_image_url: string | undefined,
	model_id: number | undefined,
	image_url_ref: React.MutableRefObject<string | undefined>,
	classes: ClassInfo[],
	set_classes: React.Dispatch<React.SetStateAction<ClassInfo[]>>,
	set_predictions: React.Dispatch<React.SetStateAction<Prediction[]>>,
	set_is_showing_predictions: (v: boolean) => void,
	set_is_running_inference: (v: boolean) => void,
	set_is_model_selector_open: (v: boolean) => void
) {
	if (!api_image_url) return
	const captured_image_url = api_image_url

	set_is_running_inference(true)
	set_is_model_selector_open(false)
	run_inference(captured_image_url, model_id)
		.then((results) => {
			if (captured_image_url !== image_url_ref.current) return
			const current_classes = classes
			let updated_classes = [...current_classes]

			const new_predictions: Prediction[] = results.map((r) => {
				let class_id = updated_classes.find(
					(c) => c.name.toLowerCase() === r.class_name.toLowerCase()
				)?.id

				if (!class_id) {
					const new_class = class_create(r.class_name, updated_classes)
					updated_classes = [...updated_classes, new_class]
					class_id = new_class.id
				}

				return {
					id: 'p_' + Math.random().toString(36).substr(2, 9),
					type: 'bbox' as const,
					classId: class_id,
					x: r.x,
					y: r.y,
					w: r.w,
					h: r.h,
					confidence: r.confidence
				}
			})

			if (updated_classes.length > current_classes.length) {
				set_classes(updated_classes)
			}
			set_predictions(new_predictions)
			set_is_showing_predictions(true)
		})
		.catch((err) => console.error('Inference failed:', err))
		.finally(() => set_is_running_inference(false))
}

export function handle_keyboard_shortcut(
	e: KeyboardEvent,
	handle_save: () => Promise<void>,
	set_active_tool: (t: Mode) => void,
	set_brush_size: (fn: (s: number) => number) => void,
	set_zoom_level: (fn: (z: number) => number) => void,
	selected_ann_id: string | undefined,
	selected_prediction_id: string | undefined,
	set_annotations: (fn: (prev: Annotation[]) => Annotation[]) => void,
	set_predictions: (fn: (prev: Prediction[]) => Prediction[]) => void,
	set_selected_ann_id: (id: string | undefined) => void,
	set_selected_prediction_id: (id: string | undefined) => void,
	classes: ClassInfo[],
	set_active_class: (id: string) => void,
	undo: () => void,
	redo: () => void
) {
	if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
	const key = e.key.toLowerCase()
	if ((e.ctrlKey || e.metaKey) && key === 's') {
		e.preventDefault()
		void handle_save()
		return
	}
	if (handle_mode_shortcut(key, set_active_tool, e)) return
	if (handle_brush_size_shortcut(key, set_brush_size)) return
	if (handle_zoom_level_shortcut(key, set_zoom_level)) return
	if (
		handle_delete_shortcut(
			key,
			selected_ann_id,
			selected_prediction_id,
			set_annotations,
			set_predictions,
			set_selected_ann_id,
			set_selected_prediction_id
		)
	)
		return
	if (handle_class_shortcut(key, classes, set_active_class)) return
	handle_undo_redo_shortcut(key, e, undo, redo)
}
