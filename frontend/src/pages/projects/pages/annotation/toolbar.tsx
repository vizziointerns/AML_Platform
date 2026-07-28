import {
	ArrowLeft,
	Undo,
	Redo,
	Save,
	Loader2,
	ChevronLeft,
	ChevronRight,
	ZoomIn,
	ZoomOut,
	Maximize,
	CheckCircle2
} from 'lucide-react'

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
			className={`h-14 border-b ${border_subtle} ${bg_panel} flex items-center justify-between px-4 shrink-0 z-10 box-border overflow-x-auto hide-scrollbar`}
		>
			<div className="flex items-center gap-4 min-w-max">
				<div className="flex items-center gap-2">
					{on_back && (
						<button
							onClick={on_back}
							className={`p-1.5 rounded-md ${bg_hover} transition-colors ${text_muted} hover:text-zinc-900 dark:hover:text-zinc-100`}
							title="Back to Datasets"
						>
							<ArrowLeft size={18} />
						</button>
					)}
					<button
						onClick={undo}
						disabled={history_step === 0}
						className={`p-1.5 rounded-md ${bg_hover} transition-colors ${text_muted} hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed`}
						title="Undo (Ctrl+Z)"
					>
						<Undo size={18} />
					</button>
					<button
						onClick={redo}
						disabled={history_step === history_length - 1}
						className={`p-1.5 rounded-md ${bg_hover} transition-colors ${text_muted} hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed`}
						title="Redo (Ctrl+Y)"
					>
						<Redo size={18} />
					</button>
					<div className={`w-px h-5 mx-1 ${border_subtle}`}></div>
					<button
						onClick={on_save}
						disabled={is_saving}
						className={`p-1.5 rounded-md ${bg_hover} transition-colors ${text_muted} hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50`}
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
						className={`p-1.5 rounded-md border ${border_subtle} ${bg_hover} transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${has_prev ? `${text_muted} hover:text-zinc-900 dark:hover:text-zinc-100` : text_muted}`}
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
						className={`p-1.5 rounded-md border ${border_subtle} ${bg_hover} transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${has_next ? `${text_muted} hover:text-zinc-900 dark:hover:text-zinc-100` : text_muted}`}
					>
						<ChevronRight size={16} />
					</button>
				</div>
			</div>
			<div className="flex items-center gap-3 shrink-0">
				<div className={`flex items-center rounded-md border ${border_subtle} overflow-hidden h-8`}>
					<button
						onClick={() => set_zoom_level((z) => Math.max(z - 0.5, 0.5))}
						className={`px-2 h-full ${bg_hover} transition-colors ${text_muted} hover:text-zinc-900 dark:hover:text-zinc-100`}
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
						className={`px-2 h-full ${bg_hover} transition-colors ${text_muted} hover:text-zinc-900 dark:hover:text-zinc-100`}
					>
						<ZoomIn size={16} />
					</button>
				</div>
				<button
					onClick={center_image}
					className={`p-1.5 rounded-md border ${border_subtle} ${bg_hover} transition-colors ${text_muted} hover:text-zinc-900 dark:hover:text-zinc-100`}
					title="Fit to Screen"
				>
					<Maximize size={16} />
				</button>
				<div className={`w-px h-5 mx-1 ${border_subtle}`}></div>
				<button
					onClick={on_start_training}
					className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 text-sm font-medium rounded-md hover:bg-emerald-600/20 transition-colors shrink-0"
				>
					<CheckCircle2 size={16} /> Start Training
				</button>
			</div>
		</div>
	)
}
