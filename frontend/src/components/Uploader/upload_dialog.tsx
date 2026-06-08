import { Minimize2, X, CheckCircle2 } from 'lucide-react'
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
	pending_count
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
	file_input_ref: React.RefObject<HTMLInputElement | null>
	folder_input_ref: React.RefObject<HTMLInputElement | null>
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
}) {
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
								Drag images or folders to ingest into your active project.
							</p>
						</div>
						<div className="flex items-center gap-2 text-zinc-400">
							<button
								className={`p-2 rounded-md hover:${bg_subtle} transition-colors`}
								onClick={on_minimize}
							>
								<Minimize2 size={18} />
							</button>
							<button
								className={`p-2 rounded-md hover:${bg_subtle} transition-colors`}
								onClick={on_close}
							>
								<X size={18} />
							</button>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto px-6 py-6 pb-2 space-y-6">
						<div className="flex items-center justify-between text-sm">
							<span className={`font-medium ${text_heading}`}>Target Dataset</span>
							<select
								value={target_dataset}
								onChange={(e) => on_target_dataset_change(e.target.value)}
								className={`px-3 py-1.5 rounded-lg border ${border_subtle} ${is_dark_mode ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-900'} outline-none focus:border-blue-500`}
							>
								<option value="Urban_Vehicles_v4">Urban_Vehicles_v4</option>
								<option value="Drone_Terrain_Maps">Drone_Terrain_Maps</option>
								<option value="Retail_Shelves_DB">Retail_Shelves_DB</option>
								<option value="New_Dataset">+ Create New Dataset</option>
							</select>
						</div>

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
									{completed_files === total_files && total_files > 0 ? (
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
						text_muted={text_muted}
						text_heading={text_heading}
						border_subtle={border_subtle}
						bg_subtle={bg_subtle}
					/>
				</div>
			</div>
		</>
	)
}
