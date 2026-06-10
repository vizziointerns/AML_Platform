import { useState, useEffect, useRef, useCallback } from 'react'
import {
	MousePointer2,
	MousePointerClick,
	ShieldAlert,
	Hand,
	Square,
	Hexagon,
	Pencil,
	Eraser
} from 'lucide-react'
import AnnotationCanvas from '../../../../components/AnnotationCanvas'
import type { Annotation, Collaborator, Prediction, Mode, ClassInfo } from './types'
import {
	handle_mode_shortcut,
	handle_brush_size_shortcut,
	handle_zoom_level_shortcut,
	handle_delete_shortcut,
	handle_undo_redo_shortcut,
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
	render_left_panel
} from './render'

interface AnnotationStudioProps {
	isDarkMode: boolean
}

const tools = [
	{ id: 'select' as Mode, icon: MousePointer2, label: 'Select (V)' },
	{ id: 'pan' as Mode, icon: Hand, label: 'Pan (H)' },
	{ id: 'bbox' as Mode, icon: Square, label: 'Bounding Box (B)' },
	{ id: 'polygon' as Mode, icon: Hexagon, label: 'Polygon (P)' },
	{ id: 'brush' as Mode, icon: Pencil, label: 'Brush (W)' },
	{ id: 'eraser' as Mode, icon: Eraser, label: 'Eraser (E)' }
]

const classes: ClassInfo[] = [
	{ id: 'vehicle', name: 'vehicle', color: '#3b82f6' },
	{ id: 'pedestrian', name: 'pedestrian', color: '#10b981' },
	{ id: 'traffic_light', name: 'traffic_light', color: '#f59e0b' },
	{ id: 'cyclist', name: 'cyclist', color: '#8b5cf6' }
]

export default function annotation_studio({ isDarkMode }: AnnotationStudioProps) {
	const [left_width, set_left_width] = useState(240)
	const [right_width, set_right_width] = useState(280)
	const [active_tool, set_active_tool] = useState<Mode>('select')
	const [is_layers_open, set_is_layers_open] = useState(true)
	const [is_classes_open, set_is_classes_open] = useState(true)

	const [zoom_level, set_zoom_level] = useState(1)
	const [offset, set_offset] = useState({ x: 0, y: 0 })

	const [brush_size, set_brush_size] = useState(20)
	const [brush_opacity, set_brush_opacity] = useState(100)

	const [active_class, set_active_class] = useState('vehicle')

	const [history, set_history] = useState<Annotation[][]>([
		[
			{ id: '1', type: 'bbox', classId: 'vehicle', x: 15, y: 20, w: 15, h: 12, status: 'approved' },
			{
				id: '2',
				type: 'bbox',
				classId: 'pedestrian',
				x: 60,
				y: 55,
				w: 5,
				h: 18,
				lockedBy: 'u2',
				status: 'pending'
			},
			{
				id: '3',
				type: 'polygon',
				classId: 'cyclist',
				x: 30,
				y: 30,
				w: 15,
				h: 20,
				points: [
					{ x: 30, y: 30 },
					{ x: 45, y: 35 },
					{ x: 40, y: 50 },
					{ x: 32, y: 45 }
				],
				status: 'needs_review',
				comments: [
					{
						id: 'c1',
						userId: 'u1',
						text: 'Check the wheels, they seem cut off.',
						timestamp: Date.now() - 3600000
					}
				]
			}
		]
	])
	const [history_step, set_history_step] = useState(0)
	const annotations = history[history_step] ?? []

	const [collaborators, set_collaborators] = useState<Collaborator[]>([
		{ id: 'u1', name: 'Alex H.', color: '#ec4899', cursor: { x: 45, y: 30 } },
		{
			id: 'u2',
			name: 'Sam J.',
			color: '#14b8a6',
			cursor: { x: 70, y: 60 },
			activeAnnotationId: '2'
		}
	])

	useEffect(() => {
		const interval = setInterval(() => {
			set_collaborators((prev) =>
				prev.map((u) => {
					if (!u.cursor) return u
					const dx = (Math.random() - 0.5) * 4
					const dy = (Math.random() - 0.5) * 4
					return {
						...u,
						cursor: {
							x: Math.max(0, Math.min(100, u.cursor.x + dx)),
							y: Math.max(0, Math.min(100, u.cursor.y + dy))
						}
					}
				})
			)
		}, 1000)
		return () => clearInterval(interval)
	}, [])

	const [predictions, set_predictions] = useState<Prediction[]>([
		{ id: 'p1', type: 'bbox', classId: 'vehicle', x: 20, y: 70, w: 10, h: 8, confidence: 0.92 },
		{ id: 'p2', type: 'bbox', classId: 'pedestrian', x: 80, y: 30, w: 6, h: 18, confidence: 0.85 }
	])
	const [is_showing_predictions, set_is_showing_predictions] = useState(true)
	const [selected_prediction_id, set_selected_prediction_id] = useState<string | undefined>(
		undefined
	)

	const [conflict_data, set_conflict_data] = useState<
		{ annId: string; userName: string } | undefined
	>({
		annId: 'a1',
		userName: 'Alex V.'
	})

	useEffect(() => {
		const timer = setTimeout(() => set_conflict_data(undefined), 8000)
		return () => clearTimeout(timer)
	}, [])

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

	const undo = useCallback(() => {
		set_history_step((prev) => Math.max(0, prev - 1))
	}, [])

	const redo = useCallback(() => {
		set_history_step((prev) => Math.min(history.length - 1, prev + 1))
	}, [history.length])

	const [selected_ann_id, set_selected_ann_id] = useState<string | undefined>(undefined)

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

	useEffect(() => {
		const handle_key_down = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
			const key = e.key.toLowerCase()
			if (handle_mode_shortcut(key, set_active_tool)) return
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
			handle_undo_redo_shortcut(key, e, undo, redo)
		}

		window.addEventListener('keydown', handle_key_down)
		return () => window.removeEventListener('keydown', handle_key_down)
	}, [
		selected_ann_id,
		selected_prediction_id,
		undo,
		redo,
		set_annotations,
		set_predictions,
		set_selected_ann_id,
		set_selected_prediction_id
	])

	const center_image = () => {
		set_offset({ x: 0, y: 0 })
		set_zoom_level(1)
	}

	const show_prediction_btn = () => {
		set_predictions((prev) => [
			...prev,
			{
				id: 'p_' + Math.random().toString(36).substr(2, 9),
				type: 'bbox',
				classId: (classes[Math.floor(Math.random() * classes.length)] ?? classes[0]!).id,
				x: 10 + Math.random() * 50,
				y: 10 + Math.random() * 50,
				w: 10 + Math.random() * 20,
				h: 10 + Math.random() * 20,
				confidence: 0.7 + Math.random() * 0.25
			}
		])
		set_is_showing_predictions(true)
	}

	const get_class_color = (id: string) => theme_get_class_color(classes, id)
	const get_class_name = (id: string) => theme_get_class_name(classes, id)
	const get_current_count = (id: string) => theme_current_count(id, annotations)

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
				collaborators,
				isDarkMode,
				set_zoom_level,
				zoom_level,
				center_image,
				border_subtle,
				bg_panel,
				bg_hover,
				text_muted,
				text_heading
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
					get_current_count
				)}

				<div
					className={`flex-1 relative ${bg_workspace} flex items-center justify-center overflow-hidden flex-col`}
				>
					<div
						className={`absolute top-4 z-20 transition-transform ${conflict_data ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'}`}
					>
						<div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-xl border border-red-600 flex items-start gap-3 w-[400px]">
							<ShieldAlert size={20} className="shrink-0 mt-0.5 text-red-200" />
							<div className="flex-1 min-w-0 flex flex-col">
								<h4 className="font-bold text-sm tracking-tight mb-1">Conflict Detected</h4>
								<p className="text-xs text-red-100 mb-3 leading-tight">
									{conflict_data?.userName || 'A collaborator'} also edited the same annotation
									while you were working.
								</p>
								<div className="flex gap-2">
									<button
										onClick={() => set_conflict_data(undefined)}
										className="flex-1 bg-white/20 hover:bg-white/30 transition-colors py-1.5 rounded text-xs font-semibold"
									>
										Keep Mine
									</button>
									<button
										onClick={() => set_conflict_data(undefined)}
										className="flex-1 bg-white text-red-600 hover:bg-red-50 transition-colors py-1.5 rounded text-xs font-semibold"
									>
										Accept Theirs
									</button>
								</div>
							</div>
						</div>
					</div>

					<AnnotationCanvas
						imageUrl="https://images.unsplash.com/photo-1515260268569-9271009adfdb?auto=format&fit=crop&q=80&w=1600"
						annotations={annotations}
						predictions={predictions}
						showPredictions={is_showing_predictions}
						onPredictionsChange={(preds) => set_predictions(preds as Prediction[])}
						collaborators={collaborators}
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
					/>

					<div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
						<div
							className={`p-2 rounded-lg border ${border_subtle} ${bg_panel} shadow-lg backdrop-blur flex items-center gap-2 text-xs font-medium pointer-events-auto`}
						>
							<MousePointerClick size={14} className={text_muted} />
							<span className={text_heading}>Auto-Segment</span>
							<kbd
								className={`px-1 py-0.5 rounded ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'} ml-1`}
							>
								Shift+A
							</kbd>
						</div>
					</div>
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
									collaborators,
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
						collaborators,
						isDarkMode,
						text_muted,
						text_heading,
						border_subtle
					)}
				</div>
			</div>

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
		</div>
	)
}
