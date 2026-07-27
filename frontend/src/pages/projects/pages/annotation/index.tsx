import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MousePointer2, Hand, Square, Hexagon, Pencil, Eraser, WandSparkles } from 'lucide-react'
import type { Annotation, Mode, ClassInfo } from './types'
import type { Project } from '../../../../store/projectStore'
import {
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
	render_layers_panel,
	render_satellite_layers_panel,
	render_top_toolbar,
	render_left_panel,
	render_model_selection_dialog,
	type ModelOption
} from './render'
import { save_annotations } from '../../../../api/annotations'
import { use_annotation_image } from '../../../../hooks/use_annotation_image'
import { use_cog_layers } from '../../../../hooks/use_cog_layers'
import { use_cog_background } from '../../../../hooks/use_cog_background'
import { use_cog_image_info } from '../../../../hooks/use_cog_image_info'
import type { TiledBackgroundConfig } from '../../../../components/AnnotationCanvas/types'
import { get_cog_thumbnail_url } from '../../../../utils/cog'
import { use_annotation_history } from '../../../../hooks/use_annotation_history'
import { use_fetch_annotations } from '../../../../hooks/use_fetch_annotations'
import { type PaletteName } from '../../../../utils/colormaps'
import {
	save_image_class_labels,
	handle_segment_click,
	handle_sam_auto_segment,
	run_inference_handler,
	handle_keyboard_shortcut
} from './handlers'
import {
	fetch_dataset_classes_effect,
	save_classes_backend_effect,
	fetch_training_runs_effect
} from './effects'
import { render_canvas_content } from './canvas_content'
import { render_processing_overlay } from './overlay'
import { render_palette_dropdown } from './palette_dropdown'
import { render_right_properties_panel } from './properties_panel_wrapper'

interface AnnotationStudioProps {
	isDarkMode: boolean
	imageId?: string
	projectId?: string
	project?: Project
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

export default function annotation_studio({ isDarkMode, imageId, project }: AnnotationStudioProps) {
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

	const [bg_palette, set_bg_palette] = useState('grayscale')
	const [bg_band, set_bg_band] = useState(0)

	const image_url = current_image?.file_url
	const image_name = current_image?.file_name
	const api_image_url = current_image?.original_file_url ?? image_url
	const image_url_ref = useRef(api_image_url)
	image_url_ref.current = api_image_url
	const is_loading_image = is_loading_images

	const is_cog_project = project?.type === 'COG'

	const cog_image_info = use_cog_image_info(image_url, image_name, current_image?.file_extension)

	const tiled_background_config: TiledBackgroundConfig | undefined = useMemo(() => {
		if (!is_cog_project || !cog_image_info || !image_url) return undefined
		return {
			url: image_url,
			band: bg_band,
			palette: bg_palette as PaletteName,
			image_width: cog_image_info.width,
			image_height: cog_image_info.height
		}
	}, [is_cog_project, cog_image_info, image_url, bg_band, bg_palette])

	const display_image_url = use_cog_background(
		image_url,
		bg_palette as PaletteName,
		bg_band,
		image_name,
		current_image?.file_extension
	)

	const {
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
		set_is_saving,
		save_message,
		set_save_message
	} = use_annotation_history()

	const [selected_ann_id, set_selected_ann_id] = useState<string | undefined>(undefined)

	use_fetch_annotations(imageId, image_url, set_history, set_history_step, set_selected_ann_id)

	const [left_width, set_left_width] = useState(240)
	const [right_width, set_right_width] = useState(280)
	const [active_tool, set_active_tool] = useState<Mode>('select')
	const [is_layers_open, set_is_layers_open] = useState(true)
	const [is_classes_open, set_is_classes_open] = useState(true)

	const [zoom_level, set_zoom_level] = useState(1)
	const [offset, set_offset] = useState({ x: 0, y: 0 })

	const [brush_size, set_brush_size] = useState(20)
	const [brush_opacity, set_brush_opacity] = useState(100)

	const [is_satellite_layers_open, set_is_satellite_layers_open] = useState(true)
	const {
		cog_layers,
		is_add_cog_open,
		set_is_add_cog_open,
		new_cog_url,
		set_new_cog_url,
		handle_add_cog_layer,
		handle_update_cog_layer,
		handle_remove_cog_layer
	} = use_cog_layers()

	const [is_palette_open, set_is_palette_open] = useState(false)
	const palette_ref = useRef<HTMLDivElement | null>(undefined as unknown as HTMLDivElement | null)

	useEffect(() => {
		if (!is_palette_open) return
		const handle_click = (e: MouseEvent) => {
			if (palette_ref.current && !palette_ref.current.contains(e.target as Node)) {
				set_is_palette_open(false)
			}
		}
		document.addEventListener('mousedown', handle_click)
		return () => document.removeEventListener('mousedown', handle_click)
	}, [is_palette_open])

	const local_classes = useRef(load_classes())
	const [classes, set_classes] = useState<ClassInfo[]>(local_classes.current)
	const [active_class, set_active_class] = useState(local_classes.current[0]?.id ?? '')
	const classes_fetched = useRef(false)

	useEffect(() => {
		return fetch_dataset_classes_effect(dataset_id, set_classes, set_active_class, classes_fetched)
	}, [dataset_id])

	useEffect(() => {
		save_classes(classes)
	}, [classes])

	const save_backend_timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
	useEffect(() => {
		return save_classes_backend_effect(dataset_id, classes_fetched, classes, save_backend_timeout)
	}, [classes, dataset_id])

	useEffect(() => {
		return fetch_training_runs_effect(project_id, set_custom_models)
	}, [project_id])

	const [is_model_selector_open, set_is_model_selector_open] = useState(false)
	const [custom_models, set_custom_models] = useState<ModelOption[]>([])
	const [selected_model_id, set_selected_model_id] = useState<number | undefined>(undefined)
	const [is_running_inference, set_is_running_inference] = useState(false)
	const [is_running_segmentation, set_is_running_segmentation] = useState(false)
	const [sam3_prompt, set_sam3_prompt] = useState('')

	useEffect(() => {
		set_predictions([])
		set_is_showing_predictions(false)
		set_selected_prediction_id(undefined)
		set_zoom_level(1)
		set_offset({ x: 0, y: 0 })
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
			const class_ids = [...new Set(all_annotations.map((a) => a.classId).filter(Boolean))]
			await save_image_class_labels(imageId, class_ids, dataset_id)
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
			window.dispatchEvent(new CustomEvent('annotations-saved'))
		} catch (err) {
			console.error('Failed to save annotations:', err)
			set_save_message('Save failed')
			setTimeout(() => set_save_message(undefined), 3000)
		} finally {
			set_is_saving(false)
		}
	}, [imageId, annotations, predictions, is_saving, history_step, dataset_id])

	const undo = useCallback(() => {
		set_history_step((prev) => Math.max(0, prev - 1))
	}, [])

	const redo = useCallback(() => {
		set_history_step((prev) => Math.min(history.length - 1, prev + 1))
	}, [history.length])

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
		handle_keyboard_shortcut(
			e,
			handle_save,
			set_active_tool,
			set_brush_size,
			set_zoom_level,
			selected_ann_id,
			selected_prediction_id,
			set_annotations,
			set_predictions,
			set_selected_ann_id,
			set_selected_prediction_id,
			classes,
			set_active_class,
			undo,
			redo
		)
	}

	useEffect(() => {
		window.addEventListener('keydown', on_key_down)
		return () => window.removeEventListener('keydown', on_key_down)
	}, [
		imageId,
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

	const handle_run_inference_cb = useCallback(
		(model_id?: number) => {
			run_inference_handler(
				api_image_url,
				model_id,
				image_url_ref,
				classes,
				set_classes,
				set_predictions,
				set_is_showing_predictions,
				set_is_running_inference,
				set_is_model_selector_open
			)
		},
		[api_image_url, classes, set_classes]
	)

	const handle_segment = useCallback(
		(pos: { x: number; y: number }, image: HTMLImageElement) => {
			if (!api_image_url) return
			handle_segment_click(
				api_image_url,
				pos,
				image,
				selected_prediction_id,
				predictions,
				active_class,
				set_annotations,
				set_selected_ann_id,
				set_active_tool,
				set_is_running_segmentation,
				() => api_image_url === image_url_ref.current
			)
		},
		[
			api_image_url,
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

	const is_cog_loading = is_cog_project && !!current_image && !cog_image_info && !!image_url

	const canvas = render_canvas_content(
		is_loading_image,
		image_error,
		is_empty,
		display_image_url,
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
		cog_layers,
		handle_segment,
		tiled_background_config,
		is_cog_loading
	)

	const render_main_layout = () => (
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
					{render_processing_overlay(
						is_running_inference || is_running_segmentation,
						is_running_segmentation,
						isDarkMode,
						text_heading
					)}
					{canvas}
					{render_palette_dropdown(
						is_cog_project,
						is_palette_open,
						set_is_palette_open,
						bg_palette,
						set_bg_palette,
						bg_band,
						set_bg_band,
						cog_image_info?.band_count,
						bg_panel,
						border_subtle,
						text_muted,
						bg_hover,
						palette_ref
					)}
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

					{render_right_properties_panel(
						is_cog_project,
						selected_ann_id,
						selected_prediction_id,
						annotations,
						classes,
						set_annotations,
						isDarkMode,
						text_muted,
						text_heading,
						border_subtle,
						predictions,
						set_predictions,
						set_selected_prediction_id,
						set_selected_ann_id,
						is_showing_predictions,
						set_is_showing_predictions
					)}

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

					{render_satellite_layers_panel(
						cog_layers,
						handle_update_cog_layer,
						handle_remove_cog_layer,
						() => set_is_add_cog_open(true),
						is_satellite_layers_open,
						set_is_satellite_layers_open,
						is_cog_project,
						isDarkMode,
						text_heading,
						text_muted,
						border_subtle,
						bg_hover
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
							<img
								src={
									idx === current_index
										? get_cog_thumbnail_url(img.file_url, img.file_extension)
										: undefined
								}
								data-src={
									idx !== current_index
										? get_cog_thumbnail_url(img.file_url, img.file_extension)
										: undefined
								}
								alt={img.file_name}
								loading="lazy"
								className="w-full h-full object-cover"
								onMouseEnter={(e) => {
									const el = e.currentTarget
									if (!el.src && el.dataset.src) el.src = el.dataset.src
								}}
							/>
						</button>
					))}
				</div>
			)}

			{render_model_selection_dialog(
				is_model_selector_open,
				custom_models,
				selected_model_id,
				set_selected_model_id,
				() => {
					if (!api_image_url) return
					if (selected_model_id === -1) {
						handle_sam_auto_segment(
							api_image_url,
							active_class,
							set_is_running_segmentation,
							set_is_model_selector_open,
							set_annotations,
							set_selected_ann_id,
							set_active_tool,
							() => api_image_url === image_url_ref.current,
							'sam2.1'
						)
					} else if (selected_model_id === -2) {
						const sam3_class = sam3_prompt || active_class
						if (!sam3_class) {
							alert('Please enter a text prompt or select a class for SAM3 segmentation.')
							return
						}
						handle_sam_auto_segment(
							api_image_url,
							sam3_class,
							set_is_running_segmentation,
							set_is_model_selector_open,
							set_annotations,
							set_selected_ann_id,
							set_active_tool,
							() => api_image_url === image_url_ref.current,
							'sam3'
						)
						set_sam3_prompt('')
					} else {
						handle_run_inference_cb(selected_model_id)
					}
				},
				() => set_is_model_selector_open(false),
				is_running_inference || is_running_segmentation,
				text_muted,
				text_heading,
				bg_panel,
				border_subtle,
				bg_hover,
				sam3_prompt,
				set_sam3_prompt
			)}

			{is_add_cog_open && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
					<div
						className={`rounded-lg shadow-xl border ${border_subtle} ${bg_panel} w-full max-w-md p-6`}
					>
						<h2 className={`text-lg font-semibold mb-4 ${text_heading}`}>Add COG Layer</h2>
						<p className={`text-xs ${text_muted} mb-3`}>
							Enter the URL of a Cloud Optimized GeoTIFF to display as a raster layer.
						</p>
						<input
							autoFocus
							type="text"
							value={new_cog_url}
							onChange={(e) => set_new_cog_url(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && new_cog_url.trim()) {
									handle_add_cog_layer()
								}
								if (e.key === 'Escape') {
									set_is_add_cog_open(false)
									set_new_cog_url('')
								}
							}}
							placeholder="https://example.com/layer.tif"
							className={`w-full bg-transparent border rounded px-3 py-2 text-sm outline-none mb-4 ${
								isDarkMode
									? 'border-zinc-700 text-zinc-100 placeholder-zinc-500'
									: 'border-zinc-300 text-zinc-900 placeholder-zinc-400'
							}`}
						/>
						<div className="flex justify-end gap-3">
							<button
								onClick={() => {
									set_is_add_cog_open(false)
									set_new_cog_url('')
								}}
								className={`px-4 py-2 rounded-md text-sm font-medium border ${border_subtle} ${text_muted} ${bg_hover} transition-colors`}
							>
								Cancel
							</button>
							<button
								onClick={handle_add_cog_layer}
								disabled={!new_cog_url.trim()}
								className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Add Layer
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)

	return render_main_layout()
}
