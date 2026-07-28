import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react'
import { supabase } from '../../utils/supabase'
import { generate_tiff_preview, convert_tiff_to_png, tiff_data_url_to_file } from '../../utils/tiff'
import { use_auth } from '../../contexts/auth_context'
import { use_project_store, type ProjectType } from '../../store/projectStore'
import type { UploadFile } from '../Uploader/types'
import { upload_to_drive_and_save, cancel_all_uploads } from '../../api/upload'
import { use_google_auth } from '../../hooks/use_google_auth'
import { ensure_project_drive_folder, get_user_folder_id } from '../../utils/google_drive'
import ProjectTypeStep from './project_type_step'
import UploadStep, { type ExistingDataset } from './upload_step'

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

	const [step, set_step] = useState(1)
	const [name, set_name] = useState('')
	const [description, set_description] = useState('')
	const [type, set_type] = useState<ProjectType>('Object Detection')
	const [cover_file, set_cover_file] = useState<File | undefined>(undefined)
	const [cover_preview, set_cover_preview] = useState('')
	const [dataset_option, set_dataset_option] = useState<'skip' | 'new' | 'existing'>('skip')
	const [new_ds_name, set_new_ds_name] = useState('')
	const [new_ds_desc, set_new_ds_desc] = useState('')
	const [upload_items, set_upload_items] = useState<UploadFile[]>([])
	const [selected_ds_id, set_selected_ds_id] = useState<string | undefined>(undefined)
	const [existing_datasets, set_existing_datasets] = useState<ExistingDataset[]>([])
	const [is_datasets_loading, set_is_datasets_loading] = useState(false)
	const [name_error, set_name_error] = useState('')
	const [upload_error, set_upload_error] = useState('')
	const [is_saving, set_is_saving] = useState(false)

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'

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

	/* when Drive auth completes after a pending project creation, re-submit automatically */
	const is_pending_drive_auth = useRef(false)
	useEffect(() => {
		if (!is_pending_drive_auth.current) return
		if (google_auth.is_authenticated && !google_auth.is_loading) {
			is_pending_drive_auth.current = false
			void handle_create()
		} else if (google_auth.error) {
			is_pending_drive_auth.current = false
			set_is_saving(false)
		}
	}, [google_auth.is_authenticated, google_auth.is_loading, google_auth.error])

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
		const is_tiff = /\.tiff?$/i.test(file.name)
		if (is_tiff) {
			generate_tiff_preview(file).then((url) => {
				if (url) set_cover_preview(url)
			})
		} else {
			const reader = new FileReader()
			reader.onload = () => set_cover_preview(reader.result as string)
			reader.readAsDataURL(file)
		}
	}

	function handle_cover_remove() {
		set_cover_file(undefined)
		set_cover_preview('')
	}

	function handle_files_select(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files ?? [])
		const processed: UploadFile[] = files
			.filter((f) => {
				const is_image = f.type.startsWith('image/')
				const is_zip = f.name.endsWith('.zip')
				const is_tiff = /\.tiff?$/i.test(f.name)
				return is_image || is_zip || is_tiff
			})
			.map((f) => {
				const is_image = f.type.startsWith('image/')
				const is_tiff = /\.tiff?$/i.test(f.name)
				let preview_url: string | undefined
				if (is_image && !is_tiff) {
					preview_url = URL.createObjectURL(f)
				}
				return {
					id: crypto.randomUUID(),
					file: f,
					name: f.name,
					size: f.size,
					previewUrl: preview_url,
					progress: 0,
					status: 'pending' as const
				}
			})
		const rejected_count = files.length - processed.length
		if (rejected_count > 0) {
			set_upload_error(
				`${rejected_count} file(s) rejected. Only images, ZIP archives, and TIFF files are supported.`
			)
		} else {
			set_upload_error('')
		}
		set_upload_items((prev) => [...prev, ...processed])
		e.target.value = ''

		for (const item of processed) {
			if (/\.tiff?$/i.test(item.name)) {
				generate_tiff_preview(item.file).then((url) => {
					if (url) {
						set_upload_items((prev) =>
							prev.map((f) => (f.id === item.id ? { ...f, previewUrl: url } : f))
						)
					}
				})
			}
		}
	}

	function remove_upload_file(id: string) {
		set_upload_items((prev) => {
			const file = prev.find((f) => f.id === id)
			if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl)
			return prev.filter((f) => f.id !== id)
		})
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
		let file_to_upload = cover_file
		const is_tiff = /\.tiff?$/i.test(cover_file.name)
		if (is_tiff) {
			try {
				const png_data_url = await convert_tiff_to_png(cover_file)
				file_to_upload = await tiff_data_url_to_file(png_data_url, cover_file.name)
			} catch {
				return ''
			}
		}
		const cover_path = `${pid}/${Date.now()}-${file_to_upload.name}`
		const { error } = await supabase.storage
			.from('project-covers')
			.upload(cover_path, file_to_upload)
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
			status: upload_items.length > 0 ? 'Processing' : 'Ready',
			image_count: 0,
			class_count: 0,
			tags: [],
			storage_bytes: 0
		})
		if (error) throw new Error(error.message)

		for (const item of upload_items) {
			set_upload_items((prev) =>
				prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' as const } : f))
			)

			await upload_to_drive_and_save(item, '', ds_id, pid, {
				on_progress: (progress) => {
					set_upload_items((prev) => prev.map((f) => (f.id === item.id ? { ...f, progress } : f)))
				},
				on_complete: () => {
					set_upload_items((prev) =>
						prev.map((f) =>
							f.id === item.id ? { ...f, status: 'success' as const, progress: 100 } : f
						)
					)
				},
				on_error: (msg) => {
					set_upload_items((prev) =>
						prev.map((f) => (f.id === item.id ? { ...f, status: 'error' as const, error: msg } : f))
					)
				}
			})
		}

		window.dispatchEvent(new CustomEvent('datasets-changed'))
		window.dispatchEvent(
			new CustomEvent('upload-complete', {
				detail: { completed: upload_items.length, total: upload_items.length }
			})
		)
	}

	async function handle_post_create(resolved_option: string, pid: string) {
		if (resolved_option === 'new') {
			await create_dataset_and_upload(pid)
		} else if (resolved_option === 'existing' && selected_ds_id) {
			const { error: link_err } = await supabase
				.from('datasets')
				.update({ project_id: pid })
				.eq('id', selected_ds_id)
			if (link_err) console.error('Failed to link dataset:', link_err)
		}
	}

	async function handle_create(ds_option?: 'skip' | 'new' | 'existing') {
		if (!user) return

		/* if Drive is configured but not authenticated, popup once then resume */
		if (google_auth.is_configured && !google_auth.is_authenticated) {
			if (!google_auth.is_loading) {
				set_is_saving(true)
				is_pending_drive_auth.current = true
				google_auth.sign_in()
			}
			return
		}

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

			await handle_post_create(resolved_option, pid)

			on_close()
			navigate(`/projects/${pid}/dashboard`)
		} catch (err) {
			set_name_error(err instanceof Error ? err.message : 'Failed to create project')
			set_is_saving(false)
		}
	}

	function handle_skip() {
		void handle_create('skip')
	}

	function reset_form() {
		cancel_all_uploads(upload_items.map((f) => f.id))
		for (const item of upload_items) {
			if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
		}
		set_step(1)
		set_name('')
		set_description('')
		set_type('Object Detection')
		set_cover_file(undefined)
		set_cover_preview('')
		set_dataset_option('skip')
		set_new_ds_name('')
		set_new_ds_desc('')
		set_upload_items([])
		set_selected_ds_id(undefined)
		set_name_error('')
		set_upload_error('')
		set_existing_datasets([])
		set_is_saving(false)
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

	if (!isOpen) return undefined
	return (
		<>
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
				onClick={is_saving ? undefined : on_close}
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
							className={`p-2 rounded-md ${hover_bg} transition-colors text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed`}
							onClick={on_close}
							disabled={is_saving}
						>
							<X size={18} />
						</button>
					</div>

					<div className="px-6 py-5">
						{step_indicator()}
						{step === 1 && (
							<ProjectTypeStep
								name={name}
								description={description}
								type={type}
								cover_preview={cover_preview}
								name_error={name_error}
								is_dark_mode={is_dark_mode}
								on_name_change={set_name}
								on_description_change={set_description}
								on_type_change={set_type}
								on_cover_select={handle_cover_select}
								on_cover_remove={handle_cover_remove}
								on_name_error_clear={() => set_name_error('')}
							/>
						)}
						{step === 2 && (
							<UploadStep
								dataset_option={dataset_option}
								new_ds_name={new_ds_name}
								new_ds_desc={new_ds_desc}
								upload_items={upload_items}
								selected_ds_id={selected_ds_id}
								existing_datasets={existing_datasets}
								upload_error={upload_error}
								is_dark_mode={is_dark_mode}
								on_dataset_option_change={set_dataset_option}
								on_new_ds_name_change={set_new_ds_name}
								on_new_ds_desc_change={set_new_ds_desc}
								on_files_select={handle_files_select}
								on_remove_file={remove_upload_file}
								on_selected_ds_id_change={set_selected_ds_id}
							/>
						)}
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
												Creating...
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
