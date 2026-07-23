import { Loader2 } from 'lucide-react'

export function render_processing_overlay(
	is_processing: boolean,
	is_running_segmentation: boolean,
	isDarkMode: boolean,
	text_heading: string
) {
	if (!is_processing) return undefined
	return (
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
	)
}
