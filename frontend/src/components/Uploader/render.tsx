import {
	X,
	RefreshCw,
	AlertCircle,
	CheckCircle2,
	UploadCloud,
	Image as ImageIcon,
	FileArchive,
	Folder,
	Maximize2
} from 'lucide-react'
import type { UploadFile } from './types'

export function render_status_label(file: UploadFile) {
	if (file.status === 'uploading')
		return <span className="text-xs font-medium text-blue-500">{Math.round(file.progress)}%</span>
	if (file.status === 'success')
		return <span className="text-xs font-medium text-emerald-500">Done</span>
	if (file.status === 'error')
		return <span className="text-xs font-medium text-red-500">Failed</span>
	return <span className="text-xs font-medium text-zinc-500">Pending</span>
}

export function render_action_button(
	file: UploadFile,
	retry_upload: (id: string) => void,
	remove_file: (id: string) => void
) {
	if (file.status === 'error') {
		return (
			<button
				onClick={() => retry_upload(file.id)}
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
				onClick={() => remove_file(file.id)}
				className="text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
				title="Remove"
			>
				<X size={14} />
			</button>
		)
	}
	return undefined
}

export function render_progress_bar(file: UploadFile, is_dark_mode: boolean) {
	const bar_bg = is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'
	if (file.status === 'uploading') {
		return (
			<div className={`h-1.5 w-full rounded-full overflow-hidden mt-2 ${bar_bg}`}>
				<div
					className="h-full bg-blue-500 rounded-full transition-all duration-300"
					style={{ width: `${file.progress}%` }}
				></div>
			</div>
		)
	}
	if (file.status === 'error') {
		return (
			<div className={`h-1.5 w-full rounded-full overflow-hidden mt-2 ${bar_bg}`}>
				<div
					className="h-full bg-red-500 rounded-full"
					style={{ width: `${file.progress}%` }}
				></div>
			</div>
		)
	}
	return undefined
}

export function render_thumbnail(file: UploadFile, text_muted: string) {
	if (file.previewUrl)
		return <img src={file.previewUrl} alt={file.name} className="w-full h-full object-cover" />
	if (file.name.endsWith('.zip')) return <FileArchive size={24} className={text_muted} />
	return <ImageIcon size={24} className={text_muted} />
}

export function render_file_item(
	file: UploadFile,
	is_dark_mode: boolean,
	text_heading: string,
	text_muted: string,
	border_subtle: string,
	retry_upload: (id: string) => void,
	remove_file: (id: string) => void,
	format_size: (bytes: number) => string
) {
	return (
		<div
			className={`p-4 flex items-center gap-4 ${is_dark_mode ? 'bg-zinc-950 hover:bg-zinc-900' : 'bg-white hover:bg-zinc-50'} transition-colors group`}
		>
			<div
				className={`w-12 h-12 rounded-lg shrink-0 flex items-center justify-center overflow-hidden border ${border_subtle} ${is_dark_mode ? 'bg-zinc-900' : 'bg-zinc-100'}`}
			>
				{render_thumbnail(file, text_muted)}
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex justify-between items-start mb-1">
					<div className={`text-sm font-medium truncate pr-4 ${text_heading}`}>{file.name}</div>
					<div className="flex items-center gap-3 shrink-0">
						{render_status_label(file)}
						{render_action_button(file, retry_upload, remove_file)}
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

				{render_progress_bar(file, is_dark_mode)}
			</div>
		</div>
	)
}

export function render_minimized_widget(
	on_close: () => void,
	set_is_minimized: (v: boolean) => void,
	is_dark_mode: boolean,
	text_heading: string,
	text_muted: string,
	border_subtle: string,
	bg_card: string,
	bg_subtle: string,
	is_uploading: boolean,
	completed_files: number,
	total_files: number,
	error_files: number,
	files: UploadFile[]
) {
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

	return (
		<div
			className={`fixed bottom-4 right-4 z-50 w-80 rounded-xl shadow-2xl border ${border_subtle} ${bg_card} overflow-hidden animate-in slide-in-from-bottom-5 duration-300`}
		>
			<div
				className={`p-3 flex items-center justify-between border-b ${border_subtle} cursor-pointer hover:${bg_subtle} transition-colors`}
				onClick={() => set_is_minimized(false)}
			>
				<div className="flex items-center gap-3">
					{icon}
					<span className={`text-sm font-medium ${text_heading}`}>{title}</span>
				</div>
				<div className="flex gap-2 text-zinc-500">
					<button
						className={`hover:${text_heading} transition-colors`}
						onClick={(e) => {
							e.stopPropagation()
							set_is_minimized(false)
						}}
					>
						<Maximize2 size={14} />
					</button>
					<button
						className={`hover:${text_heading} transition-colors`}
						onClick={(e) => {
							e.stopPropagation()
							on_close()
						}}
					>
						<X size={14} />
					</button>
				</div>
			</div>
			<div className={`px-4 py-3 bg-zinc-500/5`}>
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

export function render_drag_drop_zone(
	is_drag_active: boolean,
	is_dark_mode: boolean,
	bg_drag: string,
	bg_card: string,
	bg_subtle: string,
	border_subtle: string,
	text_heading: string,
	text_muted: string,
	file_input_ref: React.RefObject<HTMLInputElement | null>,
	folder_input_ref: React.RefObject<HTMLInputElement | null>,
	handle_drag_enter: (e: React.DragEvent) => void,
	handle_drag_over: (e: React.DragEvent) => void,
	handle_drag_leave: (e: React.DragEvent) => void,
	handle_drop: (e: React.DragEvent) => void,
	handle_file_change: (e: React.ChangeEvent<HTMLInputElement>) => void
) {
	const drag_bg = is_drag_active
		? `border-blue-500 ${bg_drag}`
		: `${is_dark_mode ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-900' : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50'}`
	const icon_container_bg = is_drag_active
		? 'bg-blue-500/20 text-blue-500'
		: is_dark_mode
			? 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700'
			: 'bg-zinc-200 text-zinc-500 group-hover:bg-zinc-300'
	return (
		<div
			onDragEnter={handle_drag_enter}
			onDragOver={handle_drag_over}
			onDragLeave={handle_drag_leave}
			onDrop={handle_drop}
			className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group ${drag_bg}`}
		>
			<input
				type="file"
				multiple
				accept="image/*,.zip"
				className="hidden"
				ref={file_input_ref}
				onChange={handle_file_change}
			/>
			<input
				type="file"
				{...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
				multiple
				className="hidden"
				ref={folder_input_ref}
				onChange={handle_file_change}
			/>

			<div
				className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${icon_container_bg}`}
			>
				<UploadCloud size={32} />
			</div>

			<h3 className={`text-lg font-medium mb-1 ${text_heading}`}>
				Click to browse or drag and drop
			</h3>
			<p className={`text-sm ${text_muted} max-w-[300px] mb-6`}>
				Support for JPG, PNG, WEBP, or ZIP archives containing images. Folders preserve hierarchy.
			</p>

			<div className="flex gap-3">
				<button
					onClick={() => file_input_ref.current?.click()}
					className={`px-4 py-2 text-sm font-medium rounded-lg border ${border_subtle} ${bg_card} hover:${bg_subtle} transition-colors ${text_heading}`}
				>
					Browse Files
				</button>
				<button
					onClick={() => folder_input_ref.current?.click()}
					className={`px-4 py-2 text-sm font-medium rounded-lg border ${border_subtle} ${bg_card} hover:${bg_subtle} transition-colors ${text_heading} flex items-center gap-2`}
				>
					<Folder size={16} /> Upload Folder
				</button>
			</div>
		</div>
	)
}

export function render_upload_footer(
	files: UploadFile[],
	is_uploading: boolean,
	_completed_files: number,
	_total_files: number,
	_error_files: number,
	on_close: () => void,
	start_upload: () => void,
	set_files: (fn: (prev: UploadFile[]) => UploadFile[]) => void,
	text_muted: string,
	text_heading: string,
	border_subtle: string,
	bg_subtle: string
) {
	const pending_count = files.filter((f) => f.status === 'pending').length
	const clear_class = files.length > 0 ? `${text_muted} hover:text-red-500` : 'opacity-0'

	return (
		<div
			className={`px-6 py-4 border-t ${border_subtle} shrink-0 ${bg_subtle} rounded-b-xl flex justify-between items-center`}
		>
			<button
				onClick={() => set_files(() => [])}
				className={`text-sm font-medium ${clear_class} transition-colors`}
			>
				Clear All
			</button>
			<div className="flex gap-3">
				<button
					onClick={on_close}
					className={`px-4 py-2.5 text-sm font-medium rounded-lg hover:${bg_subtle} transition-colors ${text_heading}`}
				>
					Cancel
				</button>
				<button
					onClick={start_upload}
					disabled={is_uploading || pending_count === 0}
					className={`px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
				>
					<UploadCloud size={16} />
					Start Upload {pending_count > 0 && `(${pending_count})`}
				</button>
			</div>
		</div>
	)
}
