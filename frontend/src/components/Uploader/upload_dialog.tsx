import { Minimize2, X, CheckCircle2, Cloud, AlertTriangle } from 'lucide-react'
import type { UploadFile } from './types'
import DragDropZone from './drag_drop_zone'
import FileItem from './file_item'
import UploadFooter from './upload_footer'

export default function upload_dialog({
	on_close,
	on_minimize,
	is_dark_mode,
	text_heading,
	text_muted,
	border_subtle,
	bg_card,
	bg_subtle,
	bg_drag,
	files,
	is_drag_active,
	target_dataset,
	on_target_dataset_change,
	file_input_ref,
	folder_input_ref,
	on_drag_enter,
	on_drag_over,
	on_drag_leave,
	on_drop,
	on_file_change,
	on_start_upload,
	on_retry_upload,
	on_remove_file,
	on_clear_all,
	format_size,
	total_files,
	completed_files,
	error_files,
	is_uploading,
	pending_count,
	google_auth,
	datasets,
	new_dataset_name,
	on_new_dataset_name_change,
	new_dataset_description,
	on_new_dataset_description_change,
	is_all_complete,
	upload_error,
	on_clear_upload_error
}: {
	on_close: () => void
	on_minimize: () => void
	is_dark_mode: boolean
	text_heading: string
	text_muted: string
	border_subtle: string
	bg_card: string
	bg_subtle: string
	bg_drag: string
	files: UploadFile[]
	is_drag_active: boolean
	target_dataset: string
	on_target_dataset_change: (v: string) => void
	file_input_ref: React.RefObject<HTMLInputElement>
	folder_input_ref: React.RefObject<HTMLInputElement>
	on_drag_enter: (e: React.DragEvent) => void
	on_drag_over: (e: React.DragEvent) => void
	on_drag_leave: (e: React.DragEvent) => void
	on_drop: (e: React.DragEvent) => void
	on_file_change: (e: React.ChangeEvent<HTMLInputElement>) => void
	on_start_upload: () => void
	on_retry_upload: (id: string) => void
	on_remove_file: (id: string) => void
	on_clear_all: () => void
	format_size: (bytes: number) => string
	total_files: number
	completed_files: number
	error_files: number
	is_uploading: boolean
	pending_count: number
	google_auth: {
		is_authenticated: boolean
		is_configured: boolean
		is_loading: boolean
		sign_in: () => void
		error: string | undefined
	}
	datasets: { id: string; name: string }[]
	new_dataset_name: string
	on_new_dataset_name_change: (v: string) => void
	new_dataset_description: string
	on_new_dataset_description_change: (v: string) => void
	is_all_complete: boolean
	upload_error: string | undefined
	on_clear_upload_error: () => void
}) {
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'

	const render_google_banner = () => {
		if (!google_auth.is_configured) return undefined
		if (google_auth.is_authenticated) {
			return (
				<div
					className={`flex items-center gap-2 text-sm ${is_dark_mode ? 'text-emerald-400' : 'text-emerald-600'}`}
				>
					<Cloud size={16} />
					<span>Google Drive connected</span>
				</div>
			)
		}
		return (
			<div
				className={`flex items-center justify-between p-3 rounded-lg border ${is_dark_mode ? 'border-blue-500/30 bg-blue-500/5' : 'border-blue-200 bg-blue-50'}`}
			>
				<div className="flex items-center gap-3">
					<Cloud size={18} className="text-blue-500" />
					<span className={`text-sm ${is_dark_mode ? 'text-blue-300' : 'text-blue-700'}`}>
						Connect Google Drive to upload images
					</span>
				</div>
				<button
					onClick={google_auth.sign_in}
					disabled={google_auth.is_loading}
					className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
				>
					{google_auth.is_loading ? 'Connecting...' : 'Connect'}
				</button>
			</div>
		)
	}

	const render_upload_error = () => {
		if (!upload_error) return undefined
		return (
			<div
				className={`flex items-center gap-2 p-3 rounded-lg border ${is_dark_mode ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-red-200 bg-red-50 text-red-700'}`}
			>
				<AlertTriangle size={16} className="shrink-0" />
				<span className="text-sm font-medium flex-1">{upload_error}</span>
				<button
					onClick={on_clear_upload_error}
					className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
				>
					<X size={14} />
				</button>
			</div>
		)
	}

	const render_complete_banner = () => {
		if (!is_all_complete) return undefined
		return (
			<div
				className={`flex items-center gap-2 p-3 rounded-lg border ${is_dark_mode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
			>
				<CheckCircle2 size={18} />
				<span className="text-sm font-medium">
					All done — {total_files} file{total_files !== 1 ? 's' : ''}{' '}
					{google_auth.is_authenticated ? 'uploaded to Google Drive' : 'uploaded'}
				</span>
			</div>
		)
	}

	return (
		<>
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
				onClick={on_close}
			/>
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
				<div
					className={`pointer-events-auto w-full max-w-3xl rounded-xl shadow-2xl border ${border_subtle} ${bg_card} flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 flex-shrink-0`}
					onClick={(e) => e.stopPropagation()}
				>
					<div
						className={`px-6 py-4 border-b ${border_subtle} flex justify-between items-center shrink-0`}
					>
						<div>
							<h2 className={`text-lg font-semibold tracking-tight ${text_heading}`}>
								Upload to Dataset
							</h2>
							<p className={`text-sm ${text_muted}`}>
								{is_all_complete
									? 'Upload complete. You can close this dialog.'
									: 'Drag images or folders to ingest into your active project.'}
							</p>
						</div>
						<div className="flex items-center gap-2 text-zinc-400">
							<button
								className={`p-2 rounded-md ${hover_bg} transition-colors`}
								onClick={on_minimize}
							>
								<Minimize2 size={18} />
							</button>
							<button className={`p-2 rounded-md ${hover_bg} transition-colors`} onClick={on_close}>
								<X size={18} />
							</button>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto px-6 py-6 pb-2 space-y-6">
						{render_google_banner()}

						{render_upload_error()}

						{render_complete_banner()}

						<div className="flex items-center justify-between text-sm">
							<span className={`font-medium ${text_heading}`}>Target Dataset</span>
							<select
								value={target_dataset}
								onChange={(e) => on_target_dataset_change(e.target.value)}
								className={`px-3 py-1.5 rounded-lg border ${border_subtle} ${is_dark_mode ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-900'} outline-none focus:border-blue-500`}
								disabled={is_all_complete}
							>
								{datasets.length === 0 && <option value="">No datasets</option>}
								{datasets.map((ds) => (
									<option key={ds.id} value={ds.id}>
										{ds.name}
									</option>
								))}
								<option value="__new__">➕ Create New Dataset</option>
							</select>
						</div>

						{target_dataset === '__new__' && (
							<div className="space-y-3 p-4 rounded-lg border border-dashed border-blue-500/40">
								<span
									className={`text-sm font-medium ${is_dark_mode ? 'text-blue-300' : 'text-blue-700'}`}
								>
									New Dataset Details
								</span>
								<input
									type="text"
									value={new_dataset_name}
									onChange={(e) => on_new_dataset_name_change(e.target.value)}
									placeholder="Dataset name *"
									className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${is_dark_mode ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400'}`}
								/>
								<textarea
									value={new_dataset_description}
									onChange={(e) => on_new_dataset_description_change(e.target.value)}
									placeholder="Description (optional)"
									rows={2}
									className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none ${is_dark_mode ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400'}`}
								/>
							</div>
						)}

						<DragDropZone
							is_drag_active={is_drag_active}
							is_dark_mode={is_dark_mode}
							bg_drag={bg_drag}
							bg_card={bg_card}
							bg_subtle={bg_subtle}
							border_subtle={border_subtle}
							text_heading={text_heading}
							text_muted={text_muted}
							file_input_ref={file_input_ref}
							folder_input_ref={folder_input_ref}
							on_drag_enter={on_drag_enter}
							on_drag_over={on_drag_over}
							on_drag_leave={on_drag_leave}
							on_drop={on_drop}
							on_file_change={on_file_change}
						/>

						{files.length > 0 && (
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<h3 className={`text-sm font-medium ${text_heading}`}>
										Upload Queue ({files.length} items)
									</h3>
									{is_all_complete ? (
										<span className="text-xs font-medium text-emerald-500 flex items-center gap-1">
											<CheckCircle2 size={14} /> All complete
										</span>
									) : (
										<span className={`text-xs ${text_muted}`}>
											{completed_files} completed, {error_files} failed
										</span>
									)}
								</div>

								<div
									className={`rounded-xl border ${border_subtle} divide-y ${is_dark_mode ? 'divide-zinc-800' : 'divide-zinc-200'} overflow-hidden`}
								>
									{files.map((file) => (
										<FileItem
											key={file.id}
											file={file}
											is_dark_mode={is_dark_mode}
											text_heading={text_heading}
											text_muted={text_muted}
											border_subtle={border_subtle}
											on_retry={on_retry_upload}
											on_remove={on_remove_file}
											format_size={format_size}
										/>
									))}
								</div>
							</div>
						)}
					</div>

					<UploadFooter
						files={files}
						is_uploading={is_uploading}
						pending_count={pending_count}
						on_close={on_close}
						on_start_upload={on_start_upload}
						on_clear_all={on_clear_all}
						is_dark_mode={is_dark_mode}
						text_muted={text_muted}
						text_heading={text_heading}
						border_subtle={border_subtle}
						bg_subtle={bg_subtle}
						is_all_complete={is_all_complete}
					/>
				</div>
			</div>
		</>
	)
}
