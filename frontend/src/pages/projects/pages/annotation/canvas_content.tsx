import { Loader2, ImageIcon } from 'lucide-react'
import AnnotationCanvas from '../../../../components/AnnotationCanvas'
import type { Annotation, Prediction, Mode } from './types'
import type {
	CogLayerInfo,
	TiledBackgroundConfig
} from '../../../../components/AnnotationCanvas/types'

export function render_canvas_content(
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
	cog_layers: CogLayerInfo[] = [],
	on_segment_click?: (pos: { x: number; y: number }, image: HTMLImageElement) => void,
	tiled_background_config?: TiledBackgroundConfig,
	is_cog_loading?: boolean
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
			{image_url && !tiled_background_config && is_cog_loading && (
				<div className="absolute inset-0 flex items-center justify-center z-50 bg-black/20">
					<div className="flex flex-col items-center gap-2">
						<Loader2 size={32} className="animate-spin text-blue-500" />
						<p className="text-sm text-zinc-400">Loading satellite image...</p>
					</div>
				</div>
			)}
			{image_url && (
				<AnnotationCanvas
					imageUrl={image_url}
					tiledBackground={tiled_background_config}
					cogLayers={cog_layers}
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
