import { AlertCircle, CheckCircle2, UploadCloud, Maximize2, X } from 'lucide-react'
import type { UploadFile } from './types'

export default function upload_queue({
	on_close,
	on_maximize,
	is_dark_mode,
	text_heading,
	text_muted,
	border_subtle,
	bg_card,
	is_uploading,
	completed_files,
	total_files,
	error_files,
	files
}: {
	on_close: () => void
	on_maximize: () => void
	is_dark_mode: boolean
	text_heading: string
	text_muted: string
	border_subtle: string
	bg_card: string
	is_uploading: boolean
	completed_files: number
	total_files: number
	error_files: number
	files: UploadFile[]
}) {
	const icon = is_uploading ? (
		<div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
	) : error_files > 0 ? (
		<AlertCircle size={16} className="text-red-500" />
	) : completed_files === total_files && total_files > 0 ? (
		<CheckCircle2 size={16} className="text-emerald-500" />
	) : (
		<UploadCloud size={16} className={text_muted} />
	)

	const title = is_uploading
		? 'Uploading...'
		: error_files > 0
			? `${error_files} errors`
			: completed_files === total_files && total_files > 0
				? 'Upload complete'
				: 'Upload Queue'

	const overall_progress =
		total_files > 0
			? (files.reduce((acc, f) => acc + f.progress, 0) / (total_files * 100)) * 100
			: 0

	const hover_header = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
	const hover_btn = is_dark_mode ? 'hover:text-zinc-100' : 'hover:text-zinc-900'

	return (
		<div
			className={`fixed bottom-4 right-4 z-50 w-80 rounded-xl shadow-2xl border ${border_subtle} ${bg_card} overflow-hidden animate-in slide-in-from-bottom-5 duration-300`}
		>
			<div
				className={`p-3 flex items-center justify-between border-b ${border_subtle} cursor-pointer ${hover_header} transition-colors`}
			>
				<div className="flex items-center gap-3">
					{icon}
					<span className={`text-sm font-medium ${text_heading}`}>{title}</span>
				</div>
				<div className="flex gap-2 text-zinc-500">
					<button
						className={`${hover_btn} transition-colors`}
						onClick={(e) => {
							e.stopPropagation()
							on_maximize()
						}}
					>
						<Maximize2 size={14} />
					</button>
					<button
						className={`${hover_btn} transition-colors`}
						onClick={(e) => {
							e.stopPropagation()
							on_close()
						}}
					>
						<X size={14} />
					</button>
				</div>
			</div>
			<div className="px-4 py-3 bg-zinc-500/5">
				<div className={`text-xs ${text_muted} mb-1 flex justify-between`}>
					<span>
						{completed_files} of {total_files} uploaded
					</span>
					{is_uploading && <span>{Math.round(overall_progress)}%</span>}
				</div>
				<div
					className={`h-1.5 w-full rounded-full overflow-hidden ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
				>
					<div
						className="h-full bg-blue-500 transition-all duration-300"
						style={{ width: `${overall_progress}%` }}
					/>
				</div>
			</div>
		</div>
	)
}
