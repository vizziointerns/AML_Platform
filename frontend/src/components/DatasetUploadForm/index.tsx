import { Upload } from 'lucide-react'

interface SelectedFile {
	id: string
	name: string
	size: number
}

interface DatasetUploadFormProps {
	is_enabled: boolean
	on_toggle_enabled: () => void
	dataset_name: string
	on_dataset_name_change: (name: string) => void
	dataset_name_error: string | undefined
	selected_files: SelectedFile[]
	on_files_selected: (files: File[]) => void
	on_remove_file: (id: string) => void
	is_dark_mode: boolean
}

export function dataset_upload_form({
	is_enabled,
	on_toggle_enabled,
	dataset_name,
	on_dataset_name_change,
	dataset_name_error,
	selected_files,
	on_files_selected,
	on_remove_file,
	is_dark_mode
}: DatasetUploadFormProps) {
	let file_input_ref: HTMLInputElement | undefined

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'

	const handle_file_change = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			on_files_selected(Array.from(e.target.files))
			e.target.value = ''
		}
	}

	return (
		<div className="space-y-4">
			{/* Toggle */}
			<label className="flex items-center gap-3 cursor-pointer select-none">
				<input
					type="checkbox"
					checked={is_enabled}
					onChange={on_toggle_enabled}
					className="w-4 h-4 rounded border-zinc-600 text-blue-600 focus:ring-blue-500"
				/>
				<span className={`text-sm font-medium ${text_heading}`}>Upload dataset now</span>
				<span className={`text-xs ${text_muted}`}>(optional)</span>
			</label>

			{is_enabled && (
				<div className={`space-y-4 pl-7 border-l-2 border-blue-500/30`}>
					{/* Dataset name — required when upload is enabled */}
					<div className="space-y-1.5">
						<label className={`text-sm font-medium ${text_heading}`}>
							Dataset Name <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							value={dataset_name}
							onChange={(e) => on_dataset_name_change(e.target.value)}
							placeholder="e.g. Training Set v1"
							className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
								${border_subtle}
								${is_dark_mode ? 'bg-zinc-950 text-zinc-100 placeholder:text-zinc-500' : 'bg-white text-zinc-900 placeholder:text-zinc-400'}
								focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50
								${dataset_name_error ? 'border-red-500' : ''}`}
						/>
						{dataset_name_error && <p className="text-xs text-red-500">{dataset_name_error}</p>}
					</div>

					{/* File upload */}
					<div className="space-y-2">
						<p className={`text-xs ${text_muted}`}>
							Select image files or archives to upload to this dataset.
						</p>
						<div
							onClick={() => file_input_ref?.click()}
							className={`
								flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer
								transition-colors
								${is_dark_mode ? 'border-zinc-700 hover:border-blue-500/50 bg-zinc-800/30' : 'border-zinc-300 hover:border-blue-500/50 bg-zinc-50'}
							`}
						>
							<Upload size={24} className={text_muted} />
							<span className={`text-sm font-medium ${text_heading}`}>Click to select files</span>
							<span className={`text-xs ${text_muted}`}>Images or .zip archives</span>
						</div>
						<input
							ref={(el) => {
								file_input_ref = el ?? undefined
							}}
							type="file"
							multiple
							accept="image/*,.zip"
							className="hidden"
							onChange={handle_file_change}
						/>
					</div>

					{/* Selected files list */}
					{selected_files.length > 0 && (
						<div
							className={`rounded-lg border ${border_subtle} divide-y ${is_dark_mode ? 'divide-zinc-800' : 'divide-zinc-200'} overflow-hidden max-h-40 overflow-y-auto`}
						>
							{selected_files.map((f) => (
								<div key={f.id} className="flex items-center justify-between px-3 py-2">
									<div className="flex-1 min-w-0">
										<p className={`text-xs truncate ${text_heading}`}>{f.name}</p>
										<p className={`text-[10px] ${text_muted}`}>{(f.size / 1024).toFixed(1)} KB</p>
									</div>
									<button
										type="button"
										onClick={() => on_remove_file(f.id)}
										className={`text-xs ${text_muted} hover:text-red-500 ml-2`}
									>
										Remove
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	)
}
