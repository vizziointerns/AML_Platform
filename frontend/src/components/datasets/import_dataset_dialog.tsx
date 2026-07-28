import { useState, useRef } from 'react'
import {
	X,
	Upload,
	Database,
	Download,
	Loader2,
	FileImage,
	AlertCircle,
	FileArchive,
	CheckCircle2
} from 'lucide-react'
import { supabase } from '../../utils/supabase'
import { use_auth } from '../../contexts/auth_context'
import { upload_file } from '../../api/upload'
import type { UploadFile } from '../Uploader/types'

interface ExistingDataset {
	id: string
	project_id: string
	name: string
	description: string | null
	image_count: number
	class_count: number
}

function format_file_size(bytes: number): string {
	if (bytes === 0) return '0 B'
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(1024))
	return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i]
}

export function import_dataset_dialog({
	is_open,
	on_close,
	is_dark_mode,
	project_id,
	on_imported
}: {
	is_open: boolean
	on_close: () => void
	is_dark_mode: boolean
	project_id: string | undefined
	on_imported: () => void
}) {
	const [option, set_option] = useState<'new' | 'existing'>('new')
	const [new_ds_name, set_new_ds_name] = useState('')
	const [new_ds_desc, set_new_ds_desc] = useState('')
	const [upload_items, set_upload_items] = useState<UploadFile[]>([])
	const [is_creating, set_is_creating] = useState(false)
	const [upload_error, set_upload_error] = useState('')
	const [existing_datasets, set_existing_datasets] = useState<ExistingDataset[]>([])
	const [is_loading_datasets, set_is_loading_datasets] = useState(false)
	const [selected_ds_id, set_selected_ds_id] = useState<string | undefined>(undefined)
	const [is_importing, set_is_importing] = useState(false)
	const { user } = use_auth()
	const folder_input_ref = useRef<HTMLInputElement>(undefined!)

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	const input_bg = is_dark_mode ? 'bg-zinc-950' : 'bg-white'

	function add_files(files: File[]) {
		const new_items: UploadFile[] = files.map((file) => ({
			id: crypto.randomUUID(),
			file,
			name: file.name,
			size: file.size,
			previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
			progress: 0,
			status: 'pending'
		}))
		set_upload_items((prev) => [...prev, ...new_items])
		set_upload_error('')
	}

	function on_files_select(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files ?? [])
		if (files.length > 0) add_files(files)
		e.target.value = ''
	}

	function on_remove_file(id: string) {
		set_upload_items((prev) => prev.filter((item) => item.id !== id))
	}

	async function fetch_existing_datasets() {
		if (!project_id || !user) return
		set_is_loading_datasets(true)
		try {
			const { data: projects } = await supabase.from('projects').select('id').eq('user_id', user.id)
			const project_ids = (projects ?? []).map((p) => p.id)
			if (project_ids.length === 0) {
				set_existing_datasets([])
				return
			}
			const { data } = await supabase
				.from('datasets')
				.select('id, project_id, name, description, image_count, class_count')
				.in('project_id', project_ids)
				.neq('project_id', project_id)
				.order('updated_at', { ascending: false })
			const dataset_list = (data ?? []) as ExistingDataset[]
			const count_map = await load_dataset_counts(dataset_list)
			for (const ds of dataset_list) {
				ds.image_count = count_map[ds.id] ?? 0
			}
			set_existing_datasets(dataset_list)
		} catch {
			set_existing_datasets([])
		} finally {
			set_is_loading_datasets(false)
		}
	}

	async function load_dataset_counts(dataset_list: ExistingDataset[]) {
		const dataset_ids = dataset_list.map((d) => d.id)
		const count_map: Record<string, number> = {}
		if (dataset_ids.length === 0) return count_map
		const { data: image_rows } = await supabase
			.from('dataset_images')
			.select('dataset_id')
			.in('dataset_id', dataset_ids)
		for (const row of image_rows ?? []) {
			count_map[row.dataset_id] = (count_map[row.dataset_id] ?? 0) + 1
		}
		return count_map
	}

	async function handle_import_existing() {
		if (!selected_ds_id || !project_id) return
		set_is_importing(true)
		const { error } = await supabase
			.from('datasets')
			.update({ project_id })
			.eq('id', selected_ds_id)
		set_is_importing(false)
		if (error) return
		on_close()
		on_imported()
	}

	async function handle_create_dataset() {
		if (!project_id || !new_ds_name.trim() || upload_items.length === 0) return
		set_is_creating(true)
		set_upload_error('')
		try {
			const { data: dataset, error: ds_err } = await supabase
				.from('datasets')
				.insert({
					project_id,
					name: new_ds_name.trim(),
					description: new_ds_desc.trim() || undefined,
					status: 'ready',
					image_count: 0,
					class_count: 0
				})
				.select('id')
				.single()
			if (ds_err || !dataset) throw new Error(ds_err?.message ?? 'Failed to create dataset')
			const total = upload_items.length
			for (let i = 0; i < total; i++) {
				const item = upload_items[i]!
				await upload_file(item, dataset.id, {
					on_progress: (progress) => {
						set_upload_items((prev) => {
							const next = [...prev]
							next[i] = { ...next[i]!, progress, status: 'uploading' }
							return next
						})
					},
					on_complete: () => {
						set_upload_items((prev) => {
							const next = [...prev]
							next[i] = { ...next[i]!, progress: 100, status: 'success' }
							return next
						})
					},
					on_error: (error) => {
						set_upload_items((prev) => {
							const next = [...prev]
							next[i] = { ...next[i]!, status: 'error', error }
							return next
						})
					}
				})
			}
			on_close()
			window.dispatchEvent(new CustomEvent('datasets-changed'))
			on_imported()
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to import dataset'
			set_upload_error(message)
		} finally {
			set_is_creating(false)
		}
	}

	function handle_submit() {
		if (option === 'new') return handle_create_dataset()
		return handle_import_existing()
	}

	function render_status_indicator(item: UploadFile) {
		if (item.status === 'success') {
			return (
				<div className="flex items-center gap-1.5 shrink-0">
					<CheckCircle2 size={14} className="text-emerald-500" />
					<span className="text-xs font-medium text-emerald-500">Done</span>
				</div>
			)
		}
		if (item.status === 'error') {
			return (
				<div className="flex items-center gap-1.5 shrink-0">
					<AlertCircle size={14} className="text-red-500" />
					<span className="text-xs font-medium text-red-500">Failed</span>
				</div>
			)
		}
		if (item.status === 'uploading') {
			return (
				<div className="flex items-center gap-1.5 shrink-0">
					<span className="text-xs font-medium text-blue-500">{item.progress}%</span>
				</div>
			)
		}
		return (
			<div className="flex items-center gap-1.5 shrink-0">
				<span className="text-xs font-medium text-zinc-500">Pending</span>
			</div>
		)
	}

	function render_file_item(item: UploadFile) {
		const is_uploading = item.status === 'uploading'
		const is_error = item.status === 'error'
		const is_success = item.status === 'success'
		const is_zip = item.name.endsWith('.zip')

		let thumbnail: React.ReactNode
		if (item.previewUrl && !is_zip) {
			thumbnail = (
				<img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
			)
		} else if (is_zip) {
			thumbnail = <FileArchive size={18} className={text_muted} />
		} else {
			thumbnail = <FileImage size={18} className={text_muted} />
		}

		return (
			<div
				key={item.id}
				className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${border_subtle} ${bg_subtle}`}
			>
				<div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-zinc-800/30">
					{thumbnail}
				</div>
				<div className="flex-1 min-w-0 space-y-1">
					<div className="flex items-center justify-between gap-2">
						<span className={`text-sm font-medium break-all ${text_heading}`}>{item.name}</span>
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
						onChange={(e) => set_new_ds_name(e.target.value)}
						placeholder="e.g. Training Images"
						disabled={is_creating}
						className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors
							${border_subtle}
							${input_bg}
							${is_dark_mode ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}
							focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50`}
					/>
				</div>
				<div>
					<label className={`text-xs font-medium ${text_heading} block mb-1`}>Description</label>
					<textarea
						value={new_ds_desc}
						onChange={(e) => set_new_ds_desc(e.target.value)}
						placeholder="Optional description"
						rows={2}
						disabled={is_creating}
						className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors resize-none
							${border_subtle}
							${input_bg}
							${is_dark_mode ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}
							focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50`}
					/>
				</div>
				<div>
					<label className={`text-xs font-medium ${text_heading} block mb-1`}>Upload Images</label>
					<div
						onClick={() => folder_input_ref.current?.click()}
						className={`w-full py-6 rounded-lg border-2 border-dashed ${border_subtle} ${hover_bg} transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer`}
					>
						<Upload size={20} className={text_muted} />
						<span className={`text-xs ${text_muted}`}>Drop a folder here or click to browse</span>
					</div>
					<input
						ref={folder_input_ref}
						type="file"
						{...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
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
						<div className="space-y-2">{upload_items.map((item) => render_file_item(item))}</div>
					</div>
				)}
			</div>
		)
	}

	function render_existing_dataset_list() {
		if (is_loading_datasets) {
			return (
				<div className="flex items-center justify-center py-6">
					<Loader2 size={18} className="animate-spin text-zinc-400" />
				</div>
			)
		}
		if (existing_datasets.length === 0) {
			return (
				<p className={`text-xs ${text_muted} py-4 text-center`}>
					No datasets found in other projects
				</p>
			)
		}
		return (
			<div className="space-y-1 max-h-40 overflow-y-auto pr-1">
				{existing_datasets.map((ds) => (
					<button
						key={ds.id}
						type="button"
						onClick={() => set_selected_ds_id(ds.id)}
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
					option === 'new'
						? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/20'
						: `${border_subtle} ${hover_bg}`
				}`}
			>
				<input
					type="radio"
					name="import_option"
					checked={option === 'new'}
					onChange={() => set_option('new')}
					className="mt-0.5 accent-blue-600"
				/>
				<div className="flex-1 space-y-3">
					<div>
						<span className={`text-sm font-medium ${text_heading}`}>Upload new dataset</span>
						<p className={`text-xs ${text_muted}`}>
							Create a dataset and upload images from your computer
						</p>
					</div>
					{option === 'new' && render_new_dataset_fields()}
				</div>
			</label>
		)
	}

	function render_dataset_option_existing() {
		return (
			<label
				className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
					option === 'existing'
						? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/20'
						: `${border_subtle} ${hover_bg}`
				}`}
			>
				<input
					type="radio"
					name="import_option"
					checked={option === 'existing'}
					onChange={() => {
						set_option('existing')
						if (existing_datasets.length === 0) {
							void fetch_existing_datasets()
						}
					}}
					className="mt-0.5 accent-blue-600"
				/>
				<div className="flex-1">
					<div className="mb-2">
						<span className={`text-sm font-medium ${text_heading}`}>Use existing dataset</span>
						<p className={`text-xs ${text_muted}`}>
							Select a dataset from any of your other projects
						</p>
					</div>
					{option === 'existing' && render_existing_dataset_list()}
				</div>
			</label>
		)
	}

	if (!is_open) return undefined

	const is_new_valid = new_ds_name.trim().length > 0 && upload_items.length > 0
	const is_existing_valid = !!selected_ds_id
	const is_busy = is_creating || is_importing

	return (
		<>
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
				onClick={is_busy ? undefined : on_close}
			/>
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
				<div
					className={`pointer-events-auto w-full max-w-2xl rounded-xl shadow-2xl border ${border_subtle} ${bg_card} animate-in zoom-in-95 duration-300`}
					onClick={(e) => e.stopPropagation()}
				>
					<div
						className={`px-6 py-4 border-b ${border_subtle} flex justify-between items-center`}
					>
						<div>
							<h2 className={`text-lg font-semibold tracking-tight ${text_heading}`}>
								Import Dataset
							</h2>
							<p className={`text-xs ${text_muted} mt-0.5`}>
								Choose how you want to add a dataset to this project
							</p>
						</div>
						<button
							onClick={on_close}
							disabled={is_busy}
							className={`p-1.5 rounded-md ${hover_bg} transition-colors text-zinc-400 disabled:opacity-30`}
						>
							<X size={16} />
						</button>
					</div>

					<div className="px-6 py-5 space-y-3 max-h-[65vh] overflow-y-auto">
						{render_dataset_option_new()}
						{render_dataset_option_existing()}
					</div>

					<div
						className={`px-6 py-4 border-t ${border_subtle} ${bg_subtle} rounded-b-xl flex items-center justify-end gap-3`}
					>
						<button
							onClick={on_close}
							disabled={is_busy}
							className={`px-3 py-2 text-sm font-medium rounded-lg ${hover_bg} transition-colors ${text_muted} disabled:opacity-50`}
						>
							Cancel
						</button>
						<button
							onClick={handle_submit}
							disabled={
								is_busy ||
								(option === 'new' ? !is_new_valid : !is_existing_valid)
							}
							className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{is_busy ? (
								<>
									<Loader2 size={14} className="animate-spin" />
									Importing...
								</>
							) : (
								<>
									<Download size={14} />
									Import
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</>
	)
}
