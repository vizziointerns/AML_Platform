import { useRef } from 'react'
import {
	Upload,
	Database,
	X,
	FileImage,
	AlertCircle,
	FileArchive,
	CheckCircle2
} from 'lucide-react'
import type { UploadFile } from '../Uploader/types'

interface ExistingDataset {
	id: string
	project_id: string
	name: string
	description: string | null
	image_count: number
	class_count: number
}

export type { ExistingDataset }

interface UploadStepProps {
	dataset_option: 'skip' | 'new' | 'existing'
	new_ds_name: string
	new_ds_desc: string
	upload_items: UploadFile[]
	selected_ds_id: string | undefined
	existing_datasets: ExistingDataset[]
	upload_error: string
	is_dark_mode: boolean
	on_dataset_option_change: (value: 'skip' | 'new' | 'existing') => void
	on_new_ds_name_change: (value: string) => void
	on_new_ds_desc_change: (value: string) => void
	on_files_select: (e: React.ChangeEvent<HTMLInputElement>) => void
	on_remove_file: (id: string) => void
	on_selected_ds_id_change: (value: string | undefined) => void
}

function format_file_size(bytes: number): string {
	if (bytes === 0) return '0 B'
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(1024))
	return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function upload_step({
	dataset_option,
	new_ds_name,
	new_ds_desc,
	upload_items,
	selected_ds_id,
	existing_datasets,
	upload_error,
	is_dark_mode,
	on_dataset_option_change,
	on_new_ds_name_change,
	on_new_ds_desc_change,
	on_files_select,
	on_remove_file,
	on_selected_ds_id_change
}: UploadStepProps) {
	const file_input_ref = useRef<HTMLInputElement>(undefined!)

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
	const input_bg = is_dark_mode ? 'bg-zinc-950' : 'bg-white'

	function render_file_thumbnail(item: UploadFile) {
		const is_zip = item.name.endsWith('.zip')
		if (item.previewUrl) {
			return <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
		}
		if (is_zip) {
			return <FileArchive size={18} className={text_muted} />
		}
		return <FileImage size={18} className={text_muted} />
	}

	function render_status_indicator(item: UploadFile) {
		const is_uploading = item.status === 'uploading'
		const is_error = item.status === 'error'
		const is_success = item.status === 'success'

		let color = 'text-zinc-500'
		let label = 'Pending'
		if (is_success) {
			color = 'text-emerald-500'
			label = 'Done'
		} else if (is_error) {
			color = 'text-red-500'
			label = 'Failed'
		} else if (is_uploading) {
			color = 'text-blue-500'
			label = `${item.progress}%`
		}

		return (
			<div className="flex items-center gap-1.5 shrink-0">
				{is_success && <CheckCircle2 size={14} className="text-emerald-500" />}
				{is_error && <AlertCircle size={14} className="text-red-500" />}
				<span className={`text-xs font-medium ${color}`}>{label}</span>
			</div>
		)
	}

	function render_file_item(item: UploadFile) {
		const is_uploading = item.status === 'uploading'
		const is_error = item.status === 'error'
		const is_success = item.status === 'success'

		return (
			<div
				key={item.id}
				className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg border ${border_subtle} ${bg_subtle}`}
			>
				<div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-zinc-800/30">
					{render_file_thumbnail(item)}
				</div>

				<div className="flex-1 min-w-0 space-y-1">
					<div className="flex items-center justify-between gap-2">
						<span
							className={`text-sm font-medium truncate ${is_success || is_error ? (is_success ? 'text-emerald-500' : 'text-red-500') : text_heading}`}
						>
							{item.name}
						</span>
						{render_status_indicator(item)}
					</div>

					<div className="flex items-center justify-between gap-2">
						<span className={`text-xs ${text_muted}`}>{format_file_size(item.size)}</span>
						{is_error && item.error && (
							<span className="text-xs text-red-500 truncate max-w-[200px]">{item.error}</span>
						)}
					</div>

					{(is_uploading || is_error) && (
						<div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
							<div
								className={`h-full rounded-full transition-all duration-300 ${is_error ? 'bg-red-500' : 'bg-blue-500'}`}
								style={{ width: `${item.progress}%` }}
							/>
						</div>
					)}
				</div>

				{!is_uploading && !is_success && (
					<button
						onClick={() => on_remove_file(item.id)}
						className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-500 transition-colors shrink-0"
					>
						<X size={14} />
					</button>
				)}
			</div>
		)
	}

	function render_upload_items() {
		return <div className="space-y-2">{upload_items.map((item) => render_file_item(item))}</div>
	}

	function render_new_dataset_fields() {
		return (
			<div className="space-y-3 pl-0">
				<div>
					<label className={`text-xs font-medium ${text_heading} block mb-1`}>
						Dataset Name <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						value={new_ds_name}
						onChange={(e) => on_new_ds_name_change(e.target.value)}
						placeholder="e.g. Training Images"
						className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors
							${border_subtle}
							${input_bg}
							${is_dark_mode ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}
							focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50`}
					/>
				</div>
				<div>
					<label className={`text-xs font-medium ${text_heading} block mb-1`}>Description</label>
					<textarea
						value={new_ds_desc}
						onChange={(e) => on_new_ds_desc_change(e.target.value)}
						placeholder="Optional description"
						rows={2}
						className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors resize-none
							${border_subtle}
							${input_bg}
							${is_dark_mode ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}
							focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50`}
					/>
				</div>
				<div>
					<label className={`text-xs font-medium ${text_heading} block mb-1`}>Upload Images</label>
					<div
						onClick={() => file_input_ref.current?.click()}
						className={`w-full py-6 rounded-lg border-2 border-dashed ${border_subtle} ${hover_bg} transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer`}
					>
						<Upload size={20} className={text_muted} />
						<span className={`text-xs ${text_muted}`}>Click to select images or drag and drop</span>
					</div>
					<input
						ref={file_input_ref}
						type="file"
						accept="image/*,.zip,.tif,.tiff"
						multiple
						onChange={on_files_select}
						hidden
					/>
				</div>
				{upload_error && <p className="text-xs text-red-500">{upload_error}</p>}
				{upload_items.length > 0 && (
					<div className="space-y-1.5">
						<p className={`text-xs font-medium ${text_muted}`}>
							{upload_items.length} file{upload_items.length > 1 ? 's' : ''} selected
						</p>
						{render_upload_items()}
					</div>
				)}
			</div>
		)
	}

	function render_existing_dataset_list() {
		return (
			<div className="space-y-1 max-h-40 overflow-y-auto pr-1">
				{existing_datasets.map((ds) => (
					<button
						key={ds.id}
						type="button"
						onClick={() => on_selected_ds_id_change(ds.id)}
						className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
							selected_ds_id === ds.id
								? 'bg-blue-500/10 text-blue-500'
								: `${hover_bg} ${text_heading}`
						}`}
					>
						<div className="flex items-center gap-2 min-w-0">
							<Database size={14} className="shrink-0" />
							<span className="truncate">{ds.name}</span>
						</div>
						<span className={`text-xs shrink-0 ml-2 ${text_muted}`}>
							{ds.image_count ?? 0} images
							{ds.class_count ? ` · ${ds.class_count} classes` : ''}
						</span>
					</button>
				))}
			</div>
		)
	}

	function render_dataset_option_new() {
		return (
			<label
				className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
					dataset_option === 'new'
						? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/20'
						: `${border_subtle} ${hover_bg}`
				}`}
			>
				<input
					type="radio"
					name="dataset_option"
					checked={dataset_option === 'new'}
					onChange={() => on_dataset_option_change('new')}
					className="mt-0.5 accent-blue-600"
				/>
				<div className="flex-1 space-y-3">
					<div>
						<span className={`text-sm font-medium ${text_heading}`}>Create a new dataset</span>
						<p className={`text-xs ${text_muted}`}>Create a dataset and upload images in one go</p>
					</div>
					{dataset_option === 'new' && render_new_dataset_fields()}
				</div>
			</label>
		)
	}

	function render_dataset_option_existing() {
		if (existing_datasets.length === 0) return undefined
		return (
			<label
				className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
					dataset_option === 'existing'
						? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/20'
						: `${border_subtle} ${hover_bg}`
				}`}
			>
				<input
					type="radio"
					name="dataset_option"
					checked={dataset_option === 'existing'}
					onChange={() => {
						on_dataset_option_change('existing')
						if (existing_datasets.length > 0 && !selected_ds_id) {
							on_selected_ds_id_change(existing_datasets[0]!.id)
						}
					}}
					className="mt-0.5 accent-blue-600"
				/>
				<div className="flex-1">
					<div className="mb-2">
						<span className={`text-sm font-medium ${text_heading}`}>Use an existing dataset</span>
						<p className={`text-xs ${text_muted}`}>Select a dataset from any of your projects</p>
					</div>
					{dataset_option === 'existing' && render_existing_dataset_list()}
				</div>
			</label>
		)
	}

	return (
		<div className="space-y-5">
			<div>
				<h3 className={`text-sm font-medium ${text_heading} mb-1`}>Add images to your project?</h3>
				<p className={`text-xs ${text_muted}`}>
					You can create a new dataset with images, or use an existing one. This step is optional.
				</p>
			</div>
			<div className="space-y-3">
				{render_dataset_option_new()}
				{render_dataset_option_existing()}
			</div>
		</div>
	)
}
