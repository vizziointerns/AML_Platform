import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	X,
	ScanLine,
	Shapes,
	SquareStack,
	ChevronRight,
	ChevronLeft,
	Upload,
	Database,
	ImagePlus,
	Trash2,
	Check,
	Loader2,
	FileImage
} from 'lucide-react'
import { supabase } from '../../utils/supabase'
import { use_auth } from '../../contexts/auth_context'
import { use_project_store, type ProjectType } from '../../store/projectStore'
import type { UploadFile } from '../Uploader/types'
import { upload_file } from '../../api/upload'
import { use_google_auth } from '../../hooks/use_google_auth'
import { ensure_project_drive_folder, get_user_folder_id } from '../../utils/google_drive'

const PROJECT_TYPES: ProjectType[] = [
	'Object Detection',
	'Semantic Segmentation',
	'Instance Segmentation'
]

interface TypeMeta {
	icon: typeof ScanLine
	desc: string
}

const TYPE_META: Record<string, TypeMeta> = {
	'Object Detection': {
		icon: ScanLine,
		desc: 'Detect and locate objects in images with bounding boxes'
	},
	'Semantic Segmentation': {
		icon: Shapes,
		desc: 'Classify every pixel in an image into semantic categories'
	},
	'Instance Segmentation': {
		icon: SquareStack,
		desc: 'Detect and segment each object instance at the pixel level'
	}
}

interface ExistingDataset {
	id: string
	project_id: string
	name: string
	description: string | null
	image_count: number
	class_count: number
}

export default function create_project_wizard({
	isOpen,
	on_close,
	is_dark_mode
}: {
	isOpen: boolean
	on_close: () => void
	is_dark_mode: boolean
}) {
	const navigate = useNavigate()
	const { user } = use_auth()
	const add_project = use_project_store((s) => s.addProject)
	const google_auth = use_google_auth()

	const cover_input_ref = useRef<HTMLInputElement>(undefined!)
	const file_input_ref = useRef<HTMLInputElement>(undefined!)

	const [step, set_step] = useState(1)
	const [name, set_name] = useState('')
	const [description, set_description] = useState('')
	const [type, set_type] = useState<ProjectType>('Object Detection')
	const [cover_file, set_cover_file] = useState<File | undefined>(undefined)
	const [cover_preview, set_cover_preview] = useState('')
	const [dataset_option, set_dataset_option] = useState<'skip' | 'new' | 'existing'>('skip')
	const [new_ds_name, set_new_ds_name] = useState('')
	const [new_ds_desc, set_new_ds_desc] = useState('')
	const [upload_files, set_upload_files] = useState<File[]>([])
	const [selected_ds_id, set_selected_ds_id] = useState<string | undefined>(undefined)
	const [existing_datasets, set_existing_datasets] = useState<ExistingDataset[]>([])
	const [is_datasets_loading, set_is_datasets_loading] = useState(false)
	const [name_error, set_name_error] = useState('')
	const [is_saving, set_is_saving] = useState(false)
	const [upload_progress, set_upload_progress] = useState(0)

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
	const input_bg = is_dark_mode ? 'bg-zinc-950' : 'bg-white'

	useEffect(() => {
		if (step === 2 && user && existing_datasets.length === 0 && !is_datasets_loading) {
			fetch_existing_datasets()
		}
	}, [step, user])

	useEffect(() => {
		if (!isOpen) {
			reset_form()
		}
	}, [isOpen])

	async function enrich_with_image_counts(dss: ExistingDataset[]): Promise<ExistingDataset[]> {
		const dataset_ids = dss.map((d) => d.id)
		if (dataset_ids.length === 0) return dss
		const { data: image_rows } = await supabase
			.from('dataset_images')
			.select('dataset_id')
			.in('dataset_id', dataset_ids)
		const count_map: Record<string, number> = {}
		for (const row of image_rows ?? []) {
			count_map[row.dataset_id] = (count_map[row.dataset_id] ?? 0) + 1
		}
		for (const ds of dss) {
			ds.image_count = count_map[ds.id] ?? 0
		}
		return dss
	}

	async function fetch_existing_datasets() {
		set_is_datasets_loading(true)
		try {
			const { data: projects } = await supabase
				.from('projects')
				.select('id')
				.eq('user_id', user!.id)
			const project_ids = (projects ?? []).map((p) => p.id)
			if (project_ids.length === 0) {
				set_existing_datasets([])
				return
			}
			const { data } = await supabase
				.from('datasets')
				.select('id, project_id, name, description, image_count, class_count')
				.in('project_id', project_ids)
				.order('updated_at', { ascending: false })
			const dataset_list = (data ?? []) as ExistingDataset[]
			set_existing_datasets(await enrich_with_image_counts(dataset_list))
		} catch {
			set_existing_datasets([])
		} finally {
			set_is_datasets_loading(false)
		}
	}

	function handle_cover_select(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return
		set_cover_file(file)
		const reader = new FileReader()
		reader.onload = () => set_cover_preview(reader.result as string)
		reader.readAsDataURL(file)
	}

	function handle_cover_remove() {
		set_cover_file(undefined)
		set_cover_preview('')
	}

	function handle_files_select(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files ?? [])
		set_upload_files((prev) => [...prev, ...files])
		e.target.value = ''
	}

	function remove_upload_file(index: number) {
		set_upload_files((prev) => prev.filter((_, i) => i !== index))
	}

	function handle_next() {
		if (!name.trim()) {
			set_name_error('Project name is required')
			return
		}
		set_name_error('')
		set_step(2)
	}

	function handle_back() {
		set_step(1)
	}

	async function upload_cover_photo(pid: string): Promise<string> {
		if (!cover_file) return ''
		const cover_path = `${pid}/${Date.now()}-${cover_file.name}`
		const { error } = await supabase.storage.from('project-covers').upload(cover_path, cover_file)
		if (error) return ''
		return supabase.storage.from('project-covers').getPublicUrl(cover_path).data.publicUrl
	}

	async function resolve_drive_folder(): Promise<string | undefined> {
		if (!google_auth.is_authenticated || !google_auth.access_token) return undefined
		try {
			const user_folder_id = await get_user_folder_id(google_auth.access_token)
			return await ensure_project_drive_folder({
				access_token: google_auth.access_token,
				project_name: name.trim(),
				user_folder_id
			})
		} catch {
			return undefined
		}
	}

	async function create_dataset_and_upload(pid: string): Promise<void> {
		const ds_name = new_ds_name.trim() || 'Default Dataset'
		const ds_id = crypto.randomUUID()
		const { error } = await supabase.from('datasets').insert({
			id: ds_id,
			project_id: pid,
			name: ds_name,
			description: new_ds_desc.trim() || undefined,
			status: 'Processing',
			image_count: 0,
			class_count: 0,
			tags: [],
			storage_bytes: 0
		})
		if (error) throw new Error(error.message)

		for (const [i, f] of upload_files.entries()) {
			const wrapper: UploadFile = {
				id: `${f.name}-${i}`,
				name: f.name,
				size: f.size,
				file: f,
				status: 'pending',
				progress: 0
			}
			await upload_file(wrapper, ds_id, {
				on_progress: () => {
					set_upload_progress(Math.round(((i + 1) / upload_files.length) * 100))
				},
				on_complete: () => {},
				on_error: (msg) => {
					throw new Error(msg)
				}
			})
		}
	}

	async function handle_create(ds_option?: 'skip' | 'new' | 'existing') {
		if (!user) return
		set_is_saving(true)
		set_name_error('')

		const resolved_option = ds_option ?? dataset_option
		const pid = crypto.randomUUID()

		try {
			const thumbnail_url = await upload_cover_photo(pid)
			const drive_folder_id = await resolve_drive_folder()

			const { error: project_err } = await supabase.from('projects').insert({
				id: pid,
				user_id: user.id,
				name: name.trim(),
				description: description.trim(),
				type,
				status: 'Active',
				dataset_count: 0,
				annotation_progress: 0,
				members: [],
				last_updated: Date.now(),
				is_pinned: false,
				is_favorite: false,
				thumbnail: thumbnail_url,
				drive_folder_id
			})
			if (project_err) throw new Error(project_err.message)

			add_project({
				id: pid,
				name: name.trim(),
				description: description.trim(),
				type,
				datasetCount: 0,
				annotationProgress: 0,
				members: [],
				lastUpdated: Date.now(),
				status: 'Active',
				isPinned: false,
				isFavorite: false,
				thumbnail: thumbnail_url
			})

			on_close()
			navigate(`/projects/${pid}/dashboard`)

			if (resolved_option === 'new') {
				create_dataset_and_upload(pid).catch((err) => {
					console.error('Background dataset creation failed:', err)
				})
			} else if (resolved_option === 'existing' && selected_ds_id) {
				supabase
					.from('datasets')
					.update({ project_id: pid })
					.eq('id', selected_ds_id)
					.then(({ error }) => {
						if (error) console.error('Failed to link dataset:', error)
					})
			}
		} catch (err) {
			set_name_error(err instanceof Error ? err.message : 'Failed to create project')
			set_is_saving(false)
		}
	}

	function handle_skip() {
		void handle_create('skip')
	}

	function reset_form() {
		set_step(1)
		set_name('')
		set_description('')
		set_type('Object Detection')
		set_cover_file(undefined)
		set_cover_preview('')
		set_dataset_option('skip')
		set_new_ds_name('')
		set_new_ds_desc('')
		set_upload_files([])
		set_selected_ds_id(undefined)
		set_name_error('')
		set_upload_progress(0)
		set_existing_datasets([])
	}

	function step_indicator() {
		return (
			<div className="flex items-center gap-3 mb-6">
				{['Project Details', 'Dataset (Optional)'].map((label, i) => {
					const idx = i + 1
					const is_active = step === idx
					const is_done = step > idx
					return (
						<div key={label} className="flex items-center gap-3">
							<div
								className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
									is_active
										? 'bg-blue-600 text-white'
										: is_done
											? 'bg-emerald-600/20 text-emerald-500'
											: `${bg_subtle} ${text_muted}`
								}`}
							>
								{is_done ? (
									<Check size={12} />
								) : (
									<span
										className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
											is_active ? 'bg-white/20' : bg_card
										}`}
									>
										{idx}
									</span>
								)}
								<span>{label}</span>
							</div>
							{i < 1 && (
								<div className={`w-6 h-px ${is_done ? 'bg-emerald-500/50' : border_subtle}`} />
							)}
						</div>
					)
				})}
			</div>
		)
	}

	function render_type_cards() {
		return (
			<div className="grid grid-cols-3 gap-3">
				{PROJECT_TYPES.map((pt) => {
					const { icon: ICON, desc } = TYPE_META[pt]!
					const is_selected = type === pt
					return (
						<button
							key={pt}
							type="button"
							onClick={() => set_type(pt)}
							className={`relative p-4 rounded-xl border text-left transition-all duration-200 ${
								is_selected
									? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30'
									: `${border_subtle} ${hover_bg}`
							}`}
						>
							{is_selected && (
								<div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
									<Check size={12} className="text-white" />
								</div>
							)}
							<div
								className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
									is_selected
										? 'bg-blue-600/20 text-blue-500'
										: `${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'} ${text_muted}`
								}`}
							>
								<ICON size={20} />
							</div>
							<h4
								className={`text-sm font-semibold mb-1 ${
									is_selected ? 'text-blue-500' : text_heading
								}`}
							>
								{pt}
							</h4>
							<p className={`text-[11px] leading-relaxed ${text_muted}`}>{desc}</p>
						</button>
					)
				})}
			</div>
		)
	}

	function render_step_1() {
		return (
			<div className="space-y-5">
				<div className="space-y-1.5">
					<label className={`text-sm font-medium ${text_heading}`}>
						Project Name <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						value={name}
						onChange={(e) => {
							set_name(e.target.value)
							if (name_error) set_name_error('')
						}}
						placeholder="e.g. Autonomous Driving Pedestrians"
						className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
							${border_subtle}
							${input_bg}
							${is_dark_mode ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}
							focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50
							${name_error ? 'border-red-500' : ''}`}
					/>
					{name_error && <p className="text-xs text-red-500">{name_error}</p>}
				</div>

				<div className="space-y-1.5">
					<label className={`text-sm font-medium ${text_heading}`}>Description</label>
					<textarea
						value={description}
						onChange={(e) => set_description(e.target.value)}
						placeholder="Brief description of your project..."
						rows={3}
						className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors resize-none
							${border_subtle}
							${input_bg}
							${is_dark_mode ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}
							focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50`}
					/>
				</div>

				<div className="space-y-2">
					<label className={`text-sm font-medium ${text_heading}`}>
						Project Type <span className="text-red-500">*</span>
					</label>
					{render_type_cards()}
				</div>

				<div className="space-y-1.5">
					<label className={`text-sm font-medium ${text_heading}`}>Cover Photo (optional)</label>
					{cover_preview ? (
						<div className="relative w-full h-32 rounded-lg overflow-hidden border ${border_subtle}">
							<img src={cover_preview} alt="Cover preview" className="w-full h-full object-cover" />
							<button
								onClick={handle_cover_remove}
								className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
							>
								<Trash2 size={14} />
							</button>
						</div>
					) : (
						<button
							type="button"
							onClick={() => cover_input_ref.current?.click()}
							className={`w-full py-8 rounded-lg border-2 border-dashed ${border_subtle} ${hover_bg} transition-colors flex flex-col items-center justify-center gap-2`}
						>
							<ImagePlus size={24} className={text_muted} />
							<span className={`text-sm ${text_muted}`}>Click to upload a cover image</span>
						</button>
					)}
					<input
						ref={cover_input_ref}
						type="file"
						accept="image/*"
						onChange={handle_cover_select}
						hidden
					/>
				</div>
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
						onChange={(e) => set_new_ds_desc(e.target.value)}
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
						accept="image/*"
						multiple
						onChange={handle_files_select}
						hidden
					/>
				</div>
				{upload_files.length > 0 && (
					<div className="space-y-1.5">
						<p className={`text-xs font-medium ${text_muted}`}>
							{upload_files.length} file{upload_files.length > 1 ? 's' : ''} selected
						</p>
						<div className="flex flex-wrap gap-2">
							{upload_files.map((f, i) => (
								<div
									key={`${f.name}-${i}`}
									className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${border_subtle} ${bg_subtle}`}
								>
									<FileImage size={14} className={text_muted} />
									<span className={`text-xs truncate max-w-[120px] ${text_heading}`}>{f.name}</span>
									<button
										onClick={() => remove_upload_file(i)}
										className="p-0.5 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-500 transition-colors"
									>
										<X size={12} />
									</button>
								</div>
							))}
						</div>
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
					dataset_option === 'new'
						? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/20'
						: `${border_subtle} ${hover_bg}`
				}`}
			>
				<input
					type="radio"
					name="dataset_option"
					checked={dataset_option === 'new'}
					onChange={() => set_dataset_option('new')}
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
						set_dataset_option('existing')
						if (existing_datasets.length > 0 && !selected_ds_id) {
							set_selected_ds_id(existing_datasets[0]!.id)
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

	function render_step_2() {
		return (
			<div className="space-y-5">
				<div>
					<h3 className={`text-sm font-medium ${text_heading} mb-1`}>
						Add images to your project?
					</h3>
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

	if (!isOpen) return undefined

	return (
		<>
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
				onClick={on_close}
			/>
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
				<div
					className={`pointer-events-auto w-full max-w-[720px] max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border ${border_subtle} ${bg_card} animate-in zoom-in-95 duration-300`}
					onClick={(e) => e.stopPropagation()}
				>
					<div
						className={`px-6 py-4 border-b ${border_subtle} flex justify-between items-center sticky top-0 ${bg_card} z-10`}
					>
						<div>
							<h2 className={`text-lg font-semibold tracking-tight ${text_heading}`}>
								New Project
							</h2>
						</div>
						<button
							className={`p-2 rounded-md ${hover_bg} transition-colors text-zinc-400`}
							onClick={on_close}
						>
							<X size={18} />
						</button>
					</div>

					<div className="px-6 py-5">
						{step_indicator()}
						{step === 1 && render_step_1()}
						{step === 2 && render_step_2()}
					</div>

					<div
						className={`px-6 py-4 border-t ${border_subtle} ${bg_subtle} rounded-b-xl flex items-center justify-between`}
					>
						{step === 2 ? (
							<button
								onClick={handle_back}
								disabled={is_saving}
								className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg ${hover_bg} transition-colors ${text_heading} disabled:opacity-50`}
							>
								<ChevronLeft size={16} />
								Back
							</button>
						) : (
							<div />
						)}

						<div className="flex items-center gap-3">
							{step === 2 ? (
								<>
									<button
										onClick={handle_skip}
										disabled={is_saving}
										className={`px-3 py-2 text-sm font-medium rounded-lg ${hover_bg} transition-colors ${text_muted} disabled:opacity-50`}
									>
										Skip to Dashboard
									</button>
									<button
										onClick={() => void handle_create()}
										disabled={is_saving}
										className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{is_saving ? (
											<>
												<Loader2 size={16} className="animate-spin" />
												{upload_progress > 0 ? `Creating... ${upload_progress}%` : 'Creating...'}
											</>
										) : (
											<>
												<Check size={16} />
												Create Project
											</>
										)}
									</button>
								</>
							) : (
								<button
									onClick={handle_next}
									className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2"
								>
									Next Step
									<ChevronRight size={16} />
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
