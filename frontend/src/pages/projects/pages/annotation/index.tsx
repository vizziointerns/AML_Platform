import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
	MousePointer2,
	Hand,
	Square,
	Hexagon,
	Pencil,
	Eraser,
	WandSparkles,
	Loader2,
	ImageIcon
} from 'lucide-react'
import AnnotationCanvas from '../../../../components/AnnotationCanvas'
import type { Annotation, Prediction, Mode, ClassInfo } from './types'
import {
	handle_mode_shortcut,
	handle_brush_size_shortcut,
	handle_zoom_level_shortcut,
	handle_delete_shortcut,
	handle_undo_redo_shortcut,
	handle_class_shortcut,
	class_create,
	class_rename,
	class_delete,
	load_classes,
	save_classes,
	compute_theme_classes,
	theme_get_class_color,
	theme_get_class_name,
	theme_current_count
} from './utils'
import {
	render_annotation_properties_panel,
	render_prediction_properties_panel,
	render_image_properties_panel,
	render_layers_panel,
	render_top_toolbar,
	render_left_panel,
	render_model_selection_dialog,
	type ModelOption
} from './render'
import { fetch_annotations, save_annotations } from '../../../../api/annotations'
import { fetch_classes, save_classes_to_backend } from '../../../../api/classes'
import { fetch_training_runs } from '../../../../api/training'
import { run_inference } from '../../../../api/inference'
import { run_segmentation, run_auto_segmentation } from '../../../../api/segment'
import { use_annotation_image } from '../../../../hooks/use_annotation_image'

interface AnnotationStudioProps {
	isDarkMode: boolean
	imageId?: string
	projectId?: string
}

function handle_segment_click(
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

function handle_sam_auto_segment(
	image_url: string,
	active_class: string,
	set_is_running_segmentation: (v: boolean) => void,
	set_is_model_selector_open: (v: boolean) => void,
	set_annotations: (fn: (prev: Annotation[]) => Annotation[]) => void,
	set_selected_ann_id: (id: string | undefined) => void,
	set_active_tool: (mode: Mode) => void,
	is_current_image: () => boolean
) {
	set_is_running_segmentation(true)
	set_is_model_selector_open(false)
	run_auto_segmentation(image_url, active_class)
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

const tools = [
	{ id: 'select' as Mode, icon: MousePointer2, label: 'Select (V)' },
	{ id: 'pan' as Mode, icon: Hand, label: 'Pan (H)' },
	{ id: 'bbox' as Mode, icon: Square, label: 'Bounding Box (B)' },
	{ id: 'polygon' as Mode, icon: Hexagon, label: 'Polygon (P)' },
	{ id: 'brush' as Mode, icon: Pencil, label: 'Brush (W)' },
	{ id: 'eraser' as Mode, icon: Eraser, label: 'Eraser (E)' },
	{ id: 'segment' as Mode, icon: WandSparkles, label: 'Auto Segment (S)' }
]

function render_canvas_content(
	is_loading_image: boolean,
	image_error: string | undefined | null,
	is_empty: boolean,
	image_url: string | undefined,
	annotations: Annotation[],
	predictions: Prediction[],
	is_showing_predictions: boolean,
	set_predictions: React.Dispatch<React.SetStateAction<Prediction[]>>,
	selected_prediction_id: string | undefined,
	set_selected_prediction_id: (id: string | undefined) => void,
	active_tool: Mode,
	active_class: string,
	get_class_color: (id: string) => string,
	get_class_name: (id: string) => string,
	selected_ann_id: string | undefined,
	set_selected_ann_id: (id: string | undefined) => void,
	set_annotations: (anns: Annotation[] | ((prev: Annotation[]) => Annotation[])) => void,
	set_offset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>,
	set_zoom_level: React.Dispatch<React.SetStateAction<number>>,
	zoom_level: number,
	offset: { x: number; y: number },
	brush_size: number,
	brush_opacity: number,
	text_muted: string,
	text_heading: string,
	on_segment_click?: (pos: { x: number; y: number }, image: HTMLImageElement) => void
) {
	if (is_loading_image) {
		return (
			<div className="flex items-center justify-center h-full">
				<Loader2 size={32} className="animate-spin text-zinc-400" />
			</div>
		)
	}
	if (image_error) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-3 px-8">
				<ImageIcon size={48} className="text-red-400" />
				<p className="text-sm text-red-500 text-center">{image_error}</p>
			</div>
		)
	}
	if (is_empty) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-3 px-8">
				<ImageIcon size={48} className={text_muted} />
				<p className={`text-lg font-medium ${text_heading}`}>No images in dataset</p>
				<p className={`text-sm ${text_muted} text-center max-w-md`}>
					Upload images to this dataset to start annotating.
				</p>
			</div>
		)
	}
	return (
		<>
			{image_url && (
				<AnnotationCanvas
					imageUrl={image_url}
					annotations={annotations}
					predictions={predictions}
					showPredictions={is_showing_predictions}
					onPredictionsChange={(preds) => set_predictions(preds as Prediction[])}
					collaborators={[]}
					selectedPredictionId={selected_prediction_id}
					setSelectedPredictionId={set_selected_prediction_id}
					activeTool={active_tool}
					activeClass={active_class}
					getClassColor={get_class_color}
					getClassName={get_class_name}
					selectedAnnId={selected_ann_id}
					setSelectedAnnId={set_selected_ann_id}
					onAnnotationsChange={set_annotations}
					onOffsetChange={set_offset}
					onZoomChange={set_zoom_level}
					zoomLevel={zoom_level}
					offset={offset}
					brushSize={brush_size}
					brushOpacity={brush_opacity}
					onSegmentClick={on_segment_click}
				/>
			)}
		</>
	)
}

export default function annotation_studio({ isDarkMode, imageId }: AnnotationStudioProps) {
	const navigate = useNavigate()
	const params = useParams()
	const project_id = params.projectId

	const handle_back = useCallback(() => {
		navigate(`/projects/${project_id}/datasets`)
	}, [navigate, project_id])

	const go_to_training = useCallback(() => {
		navigate(`/projects/${project_id}/models`)
	}, [navigate, project_id])

	const {
		current_image,
		is_loading: is_loading_images,
		is_empty,
		error: image_error,
		images: all_images,
		stable_images,
		current_index,
		dataset_id,
		go_next,
		go_prev,
		has_next,
		has_prev
	} = use_annotation_image(project_id, imageId)

	const image_url = current_image?.file_url
	const image_url_ref = useRef(image_url)
	image_url_ref.current = image_url
	const is_loading_image = is_loading_images

	const [is_saving, set_is_saving] = useState(false)
	const [save_message, set_save_message] = useState<string | undefined>(undefined)

	useEffect(() => {
		if (!imageId || !image_url) return

		let is_cancelled = false

		fetch_annotations(imageId)
			.then((loaded) => {
				if (is_cancelled) return
				if (loaded.length > 0) {
					set_history([loaded])
					set_history_step(0)
					if (loaded[0]) {
						set_selected_ann_id(loaded[0].id)
					}
				} else {
					set_history([[]])
					set_history_step(0)
					set_selected_ann_id(undefined)
				}
			})
			.catch((err) => {
				if (!is_cancelled) console.error('Failed to load annotations:', err)
			})

		return () => {
			is_cancelled = true
		}
	}, [imageId, image_url])

	const [left_width, set_left_width] = useState(240)
	const [right_width, set_right_width] = useState(280)
	const [active_tool, set_active_tool] = useState<Mode>('select')
	const [is_layers_open, set_is_layers_open] = useState(true)
	const [is_classes_open, set_is_classes_open] = useState(true)

	const [zoom_level, set_zoom_level] = useState(1)
	const [offset, set_offset] = useState({ x: 0, y: 0 })

	const [brush_size, set_brush_size] = useState(20)
	const [brush_opacity, set_brush_opacity] = useState(100)

	const local_classes = useRef(load_classes())
	const [classes, set_classes] = useState<ClassInfo[]>(local_classes.current)
	const [active_class, set_active_class] = useState(local_classes.current[0]?.id ?? '')
	const classes_fetched = useRef(false)

	useEffect(() => {
		if (!dataset_id) return
		fetch_classes(dataset_id)
			.then((backend_classes) => {
				if (backend_classes.length > 0) {
					classes_fetched.current = true
					set_classes(backend_classes)
					set_active_class((prev) =>
						backend_classes.some((c) => c.id === prev) ? prev : (backend_classes[0]?.id ?? '')
					)
				}
			})
			.catch(() => {
				/* fall back to localStorage */
			})
	}, [dataset_id])

	useEffect(() => {
		save_classes(classes)
	}, [classes])

	const save_backend_timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
	useEffect(() => {
		if (!dataset_id) return
		if (classes_fetched.current) {
			classes_fetched.current = false
			return
		}
		if (classes.length === 0) return
		if (save_backend_timeout.current) clearTimeout(save_backend_timeout.current)
		save_backend_timeout.current = setTimeout(() => {
			save_classes_to_backend(dataset_id, classes).catch(() => {
				/* silently ignore */
			})
		}, 500)
		return () => {
			if (save_backend_timeout.current) clearTimeout(save_backend_timeout.current)
		}
	}, [classes, dataset_id])

	useEffect(() => {
		if (!project_id) return
		set_custom_models([])
		let is_cancelled = false
		fetch_training_runs(project_id)
			.then((runs) => {
				if (is_cancelled) return
				set_custom_models(
					runs
						.filter((r) => r.status === 'Completed')
						.map((r) => ({
							id: r.id,
							name: r.name,
							model_type: r.model_type,
							accuracy: r.accuracy
						}))
				)
			})
			.catch(() => {
				if (!is_cancelled) set_custom_models([])
			})
		return () => {
			is_cancelled = true
		}
	}, [project_id])

	const [history, set_history] = useState<Annotation[][]>([[]])
	const [history_step, set_history_step] = useState(0)
	const annotations = history[history_step] ?? []

	const [predictions, set_predictions] = useState<Prediction[]>([])
	const [is_showing_predictions, set_is_showing_predictions] = useState(false)
	const [selected_prediction_id, set_selected_prediction_id] = useState<string | undefined>(
		undefined
	)
	const [is_model_selector_open, set_is_model_selector_open] = useState(false)
	const [custom_models, set_custom_models] = useState<ModelOption[]>([])
	const [selected_model_id, set_selected_model_id] = useState<number | undefined>(undefined)
	const [is_running_inference, set_is_running_inference] = useState(false)
	const [is_running_segmentation, set_is_running_segmentation] = useState(false)
	const is_processing = is_running_inference || is_running_segmentation

	useEffect(() => {
		set_predictions([])
		set_is_showing_predictions(false)
		set_selected_prediction_id(undefined)
	}, [imageId])

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
			set_history_step((prev) => Math.min(prev + 1, 50))
		},
		[history_step]
	)

	const handle_save = useCallback(async () => {
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
		} catch (err) {
			console.error('Failed to save annotations:', err)
			set_save_message('Save failed')
			setTimeout(() => set_save_message(undefined), 3000)
		} finally {
			set_is_saving(false)
		}
	}, [imageId, annotations, predictions, is_saving, history_step])

	const undo = useCallback(() => {
		set_history_step((prev) => Math.max(0, prev - 1))
	}, [])

	const redo = useCallback(() => {
		set_history_step((prev) => Math.min(history.length - 1, prev + 1))
	}, [history.length])

	const [selected_ann_id, set_selected_ann_id] = useState<string | undefined>(undefined)
	const [new_class_name, set_new_class_name] = useState('')
	const [delete_class_id, set_delete_class_id] = useState<string | undefined>(undefined)
	const [renaming_class_id, set_renaming_class_id] = useState<string | undefined>(undefined)

	const handle_create_class = useCallback(
		(name: string, color?: string) => {
			const new_class = class_create(name, classes, color)
			set_classes((prev) => [...prev, new_class])
		},
		[classes]
	)

	const handle_rename_class = useCallback((id: string, new_name: string) => {
		set_classes((prev) => class_rename(prev, id, new_name))
		set_renaming_class_id(undefined)
	}, [])

	const handle_delete_class = useCallback(
		(id: string) => {
			const { updated_classes } = class_delete(id, classes, annotations)
			set_classes(updated_classes)
			set_annotations((prev) => prev.map((a) => (a.classId === id ? { ...a, classId: '' } : a)))
			if (active_class === id) {
				const remaining = updated_classes
				set_active_class(remaining.length > 0 ? remaining[0]!.id : '')
			}
			set_delete_class_id(undefined)
		},
		[classes, annotations, active_class, set_annotations]
	)

	const { text_muted, text_heading, border_subtle, bg_main, bg_panel, bg_hover, bg_workspace } =
		compute_theme_classes(isDarkMode)

	const is_dragging_left = useRef(false)
	const is_dragging_right = useRef(false)

	const handle_mouse_move_global = useCallback((e: MouseEvent) => {
		if (is_dragging_left.current) {
			set_left_width(Math.max(160, Math.min(e.clientX, 400)))
		} else if (is_dragging_right.current) {
			set_right_width(Math.max(200, Math.min(window.innerWidth - e.clientX, 500)))
		}
	}, [])

	const handle_mouse_up_global = useCallback(() => {
		is_dragging_left.current = false
		is_dragging_right.current = false
		document.body.style.cursor = 'default'
	}, [])

	useEffect(() => {
		window.addEventListener('mousemove', handle_mouse_move_global)
		window.addEventListener('mouseup', handle_mouse_up_global)
		return () => {
			window.removeEventListener('mousemove', handle_mouse_move_global)
			window.removeEventListener('mouseup', handle_mouse_up_global)
		}
	}, [handle_mouse_move_global, handle_mouse_up_global])

	function on_key_down(e: KeyboardEvent) {
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

	useEffect(() => {
		window.addEventListener('keydown', on_key_down)
		return () => window.removeEventListener('keydown', on_key_down)
	}, [
		selected_ann_id,
		selected_prediction_id,
		undo,
		redo,
		set_annotations,
		set_predictions,
		set_selected_ann_id,
		set_selected_prediction_id,
		classes,
		handle_save
	])

	const center_image = () => {
		set_offset({ x: 0, y: 0 })
		set_zoom_level(1)
	}

	const show_prediction_btn = () => {
		set_selected_model_id(undefined)
		set_is_model_selector_open(true)
	}

	const handle_run_inference = useCallback(
		async (model_id?: number) => {
			if (!image_url) return
			const captured_image_url = image_url

			if (model_id === -1) {
				handle_sam_auto_segment(
					captured_image_url,
					active_class,
					set_is_running_segmentation,
					set_is_model_selector_open,
					set_annotations,
					set_selected_ann_id,
					set_active_tool,
					() => captured_image_url === image_url_ref.current
				)
				return
			}

			set_is_running_inference(true)
			set_is_model_selector_open(false)
			try {
				const results = await run_inference(captured_image_url, model_id)
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
			} catch (err) {
				console.error('Inference failed:', err)
			} finally {
				set_is_running_inference(false)
			}
		},
		[image_url, classes, active_class]
	)

	const handle_segment = useCallback(
		(pos: { x: number; y: number }, image: HTMLImageElement) => {
			if (!image_url) return
			handle_segment_click(
				image_url,
				pos,
				image,
				selected_prediction_id,
				predictions,
				active_class,
				set_annotations,
				set_selected_ann_id,
				set_active_tool,
				set_is_running_segmentation,
				() => image_url === image_url_ref.current
			)
		},
		[
			image_url,
			active_class,
			selected_prediction_id,
			predictions,
			set_annotations,
			set_selected_ann_id,
			set_active_tool
		]
	)

	const get_class_color = (id: string) => theme_get_class_color(classes, id)
	const get_class_name = (id: string) => theme_get_class_name(classes, id)
	const get_current_count = (id: string) => theme_current_count(id, annotations)

	const canvas = render_canvas_content(
		is_loading_image,
		image_error,
		is_empty,
		image_url,
		annotations,
		predictions,
		is_showing_predictions,
		set_predictions,
		selected_prediction_id,
		set_selected_prediction_id,
		active_tool,
		active_class,
		get_class_color,
		get_class_name,
		selected_ann_id,
		set_selected_ann_id,
		set_annotations,
		set_offset,
		set_zoom_level,
		zoom_level,
		offset,
		brush_size,
		brush_opacity,
		text_muted,
		text_heading,
		handle_segment
	)

	return (
		<div
			className={`flex flex-col h-full w-full overflow-hidden ${bg_main} animate-in fade-in duration-300 font-sans`}
		>
			{render_top_toolbar(
				undo,
				redo,
				history_step,
				history.length,
				show_prediction_btn,
				set_zoom_level,
				zoom_level,
				center_image,
				border_subtle,
				bg_panel,
				bg_hover,
				text_muted,
				text_heading,
				handle_save,
				is_saving,
				save_message,
				handle_back,
				go_prev,
				go_next,
				has_prev,
				has_next,
				current_image?.file_name,
				current_index,
				all_images.length,
				go_to_training
			)}

			<div className="flex flex-1 overflow-hidden relative">
				{render_left_panel(
					left_width,
					border_subtle,
					bg_panel,
					tools,
					active_tool,
					set_active_tool,
					isDarkMode,
					brush_size,
					set_brush_size,
					brush_opacity,
					set_brush_opacity,
					is_classes_open,
					set_is_classes_open,
					text_heading,
					text_muted,
					bg_hover,
					classes,
					active_class,
					set_active_class,
					annotations,
					is_dragging_left,
					get_current_count,
					handle_create_class,
					handle_rename_class,
					handle_delete_class,
					renaming_class_id,
					set_renaming_class_id,
					delete_class_id,
					set_delete_class_id,
					new_class_name,
					set_new_class_name
				)}

				<div
					className={`flex-1 relative ${bg_workspace} flex items-center justify-center overflow-hidden flex-col`}
				>
					{is_processing && (
						<div
							className="absolute inset-0 bg-black/20 z-50 flex items-center justify-center"
							data-segmenting={is_running_segmentation}
						>
							<div
								className={`flex items-center gap-2 ${isDarkMode ? 'bg-zinc-800' : 'bg-white'} px-4 py-2 rounded-lg shadow-lg`}
							>
								<Loader2 size={20} className="animate-spin" />
								<span className={`text-sm font-medium ${text_heading}`}>Processing...</span>
							</div>
						</div>
					)}
					{canvas}
				</div>

				<div
					style={{ width: right_width }}
					className={`shrink-0 border-l ${border_subtle} ${bg_panel} flex flex-col z-10 relative`}
				>
					<div
						className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-20"
						onMouseDown={() => {
							is_dragging_right.current = true
							document.body.style.cursor = 'col-resize'
						}}
					/>

					<div className={`p-4 border-b ${border_subtle}`}>
						<h3 className={`text-sm font-semibold tracking-tight mb-3 ${text_heading}`}>
							{selected_ann_id
								? 'Annotation Properties'
								: selected_prediction_id
									? 'Prediction Properties'
									: 'Image Properties'}
						</h3>

						{selected_ann_id
							? render_annotation_properties_panel(
									selected_ann_id,
									annotations,
									classes,
									set_annotations,
									isDarkMode,
									text_muted,
									text_heading,
									border_subtle
								)
							: selected_prediction_id
								? render_prediction_properties_panel(
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
								: render_image_properties_panel(
										annotations,
										predictions,
										is_showing_predictions,
										set_is_showing_predictions,
										text_muted,
										text_heading
									)}
					</div>

					{render_layers_panel(
						annotations,
						predictions,
						is_layers_open,
						set_is_layers_open,
						is_showing_predictions,
						selected_ann_id,
						selected_prediction_id,
						set_selected_ann_id,
						set_selected_prediction_id,
						set_annotations,
						get_class_color,
						get_class_name,
						isDarkMode,
						text_muted,
						text_heading,
						border_subtle
					)}
				</div>
			</div>

			{stable_images.length > 1 && (
				<div
					className={`h-16 border-t ${border_subtle} ${bg_panel} flex items-center gap-2 px-4 overflow-x-auto shrink-0 w-full`}
				>
					{stable_images.map((img, idx) => (
						<button
							key={img.id}
							onClick={() => {
								set_predictions([])
								set_is_showing_predictions(false)
								set_selected_prediction_id(undefined)
								navigate(`/projects/${project_id}/annotation/${img.id}`, { replace: true })
							}}
							className={`shrink-0 w-14 h-12 rounded-md border-2 overflow-hidden transition-all ${
								idx === current_index
									? 'border-blue-500 ring-1 ring-blue-500/30'
									: `${border_subtle} hover:border-blue-400/50`
							}`}
						>
							<img src={img.file_url} alt={img.file_name} className="w-full h-full object-cover" />
						</button>
					))}
				</div>
			)}

			<div
				className={`h-8 border-t ${border_subtle} ${bg_panel} flex items-center justify-between px-3 text-[11px] shrink-0 z-10 box-border`}
			>
				<div className={`flex items-center gap-4 ${text_muted}`}>
					<span className="flex items-center gap-1.5">
						<MousePointer2 size={12} /> X: 452, Y: 1024
					</span>
					<span>|</span>
					<span className="font-medium">
						Active Tool: {tools.find((t) => t.id === active_tool)?.label}
					</span>
				</div>
				<div className={`flex items-center gap-4 ${text_muted}`}>
					<span>Press 'H' to pan, 'V' to select, '+/-' to zoom, 'W/E' for Brush/Eraser</span>
					<button className="hover:text-blue-500 font-medium">Shortcuts</button>
				</div>
			</div>

			{render_model_selection_dialog(
				is_model_selector_open,
				custom_models,
				selected_model_id,
				set_selected_model_id,
				() => handle_run_inference(selected_model_id),
				() => set_is_model_selector_open(false),
				is_processing,
				text_muted,
				text_heading,
				bg_panel,
				border_subtle,
				bg_hover
			)}
		</div>
	)
}
