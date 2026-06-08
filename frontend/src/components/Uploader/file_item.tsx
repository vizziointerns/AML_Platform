import { X, RefreshCw, FileArchive, Image as ImageIcon } from 'lucide-react'
import type { UploadFile } from './types'

function status_label(file: UploadFile) {
	if (file.status === 'uploading')
		return <span className="text-xs font-medium text-blue-500">{Math.round(file.progress)}%</span>
	if (file.status === 'success')
		return <span className="text-xs font-medium text-emerald-500">Done</span>
	if (file.status === 'error')
		return <span className="text-xs font-medium text-red-500">Failed</span>
	return <span className="text-xs font-medium text-zinc-500">Pending</span>
}

function action_button(
	file: UploadFile,
	on_retry: (id: string) => void,
	on_remove: (id: string) => void
) {
	if (file.status === 'error') {
		return (
			<button
				onClick={() => on_retry(file.id)}
				className="text-zinc-400 hover:text-blue-500"
				title="Retry"
			>
				<RefreshCw size={14} />
			</button>
		)
	}
	if (file.status !== 'success') {
		return (
			<button
				onClick={() => on_remove(file.id)}
				className="text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
				title="Remove"
			>
				<X size={14} />
			</button>
		)
	}
	return undefined
}

function progress_bar(file: UploadFile, is_dark_mode: boolean) {
	const bar_bg = is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'
	if (file.status === 'uploading' || file.status === 'error') {
		const bar_color = file.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
		return (
			<div className={`h-1.5 w-full rounded-full overflow-hidden mt-2 ${bar_bg}`}>
				<div
					className={`h-full ${bar_color} rounded-full transition-all duration-300`}
					style={{ width: `${file.progress}%` }}
				/>
			</div>
		)
	}
	return undefined
}

function thumbnail(file: UploadFile, text_muted: string) {
	if (file.previewUrl)
		return <img src={file.previewUrl} alt={file.name} className="w-full h-full object-cover" />
	if (file.name.endsWith('.zip')) return <FileArchive size={24} className={text_muted} />
	return <ImageIcon size={24} className={text_muted} />
}

export default function file_item({
	file,
	is_dark_mode,
	text_heading,
	text_muted,
	border_subtle,
	on_retry,
	on_remove,
	format_size
}: {
	file: UploadFile
	is_dark_mode: boolean
	text_heading: string
	text_muted: string
	border_subtle: string
	on_retry: (id: string) => void
	on_remove: (id: string) => void
	format_size: (bytes: number) => string
}) {
	return (
		<div
			className={`p-4 flex items-center gap-4 ${is_dark_mode ? 'bg-zinc-950 hover:bg-zinc-900' : 'bg-white hover:bg-zinc-50'} transition-colors group`}
		>
			<div
				className={`w-12 h-12 rounded-lg shrink-0 flex items-center justify-center overflow-hidden border ${border_subtle} ${is_dark_mode ? 'bg-zinc-900' : 'bg-zinc-100'}`}
			>
				{thumbnail(file, text_muted)}
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex justify-between items-start mb-1">
					<div className={`text-sm font-medium truncate pr-4 ${text_heading}`}>{file.name}</div>
					<div className="flex items-center gap-3 shrink-0">
						{status_label(file)}
						{action_button(file, on_retry, on_remove)}
					</div>
				</div>

				<div className="flex items-center gap-3 text-xs text-zinc-500">
					<span>{format_size(file.size)}</span>
					{file.status === 'uploading' && file.chunkProgress && (
						<span>
							{format_size(file.chunkProgress.loaded)} / {format_size(file.chunkProgress.total)}
						</span>
					)}
					{file.error && <span className="text-red-500 truncate">{file.error}</span>}
				</div>

				{progress_bar(file, is_dark_mode)}
			</div>
		</div>
	)
}
