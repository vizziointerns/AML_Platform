import { useState, useEffect, useRef } from 'react'
import { X, Database, Download, Upload, Loader2 } from 'lucide-react'
import { supabase } from '../../utils/supabase'
import { use_auth } from '../../contexts/auth_context'

interface ExistingDataset {
	id: string
	project_id: string
	name: string
	description: string | null
	image_count: number
	class_count: number
}

export function import_dataset_dialog({
	is_open,
	on_close,
	is_dark_mode,
	project_id,
	on_upload,
	on_imported
}: {
	is_open: boolean
	on_close: () => void
	is_dark_mode: boolean
	project_id: string | undefined
	on_upload: (datasetId?: string, options?: { folder_only?: boolean; title?: string }) => void
	on_imported: () => void
}) {
	const [option, set_option] = useState<'new' | 'existing'>('new')
	const [existing_datasets, set_existing_datasets] = useState<ExistingDataset[]>([])
	const [is_loading_datasets, set_is_loading_datasets] = useState(false)
	const [selected_ds_id, set_selected_ds_id] = useState<string | undefined>(undefined)
	const [is_importing, set_is_importing] = useState(false)
	const { user } = use_auth()
	const has_fetched = useRef(false)

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'

	useEffect(() => {
		if (is_open && option === 'existing' && !has_fetched.current) {
			fetch_existing_datasets()
		}
		if (!is_open) {
			has_fetched.current = false
			set_selected_ds_id(undefined)
			set_option('new')
			set_existing_datasets([])
		}
	}, [is_open, option])

	async function fetch_existing_datasets() {
		if (!project_id || !user) return
		set_is_loading_datasets(true)
		has_fetched.current = true
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
			const dataset_ids = dataset_list.map((d) => d.id)
			if (dataset_ids.length > 0) {
				const { data: image_rows } = await supabase
					.from('dataset_images')
					.select('dataset_id')
					.in('dataset_id', dataset_ids)
				const count_map: Record<string, number> = {}
				for (const row of image_rows ?? []) {
					count_map[row.dataset_id] = (count_map[row.dataset_id] ?? 0) + 1
				}
				for (const ds of dataset_list) {
					ds.image_count = count_map[ds.id] ?? 0
				}
			}
			set_existing_datasets(dataset_list)
		} catch {
			set_existing_datasets([])
		} finally {
			set_is_loading_datasets(false)
		}
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

	function handle_confirm() {
		if (option === 'new') {
			on_close()
			on_upload('__new__', { folder_only: true, title: 'Import Dataset' })
		} else {
			void handle_import_existing()
		}
	}

	if (!is_open) return undefined

	return (
		<>
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
				onClick={is_importing ? undefined : on_close}
			/>
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
				<div
					className={`pointer-events-auto w-full max-w-lg rounded-xl shadow-2xl border ${border_subtle} ${bg_card} animate-in zoom-in-95 duration-300`}
					onClick={(e) => e.stopPropagation()}
				>
					<div className={`px-5 py-4 border-b ${border_subtle} flex justify-between items-center`}>
						<h2 className={`text-base font-semibold tracking-tight ${text_heading}`}>
							Import Dataset
						</h2>
						<button
							onClick={on_close}
							disabled={is_importing}
							className={`p-1.5 rounded-md ${hover_bg} transition-colors text-zinc-400 disabled:opacity-30`}
						>
							<X size={16} />
						</button>
					</div>

					<div className="px-5 py-4 space-y-3">
						<label
							className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
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
							<div className="flex-1">
								<div className="flex items-center gap-2">
									<Upload size={16} className="text-blue-500" />
									<span className={`text-sm font-medium ${text_heading}`}>Upload new dataset</span>
								</div>
								<p className={`text-xs ${text_muted} mt-1`}>
									Upload images from your computer or Google Drive
								</p>
							</div>
						</label>

						<label
							className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
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
									if (!has_fetched.current) {
										fetch_existing_datasets()
									}
								}}
								className="mt-0.5 accent-blue-600"
							/>
							<div className="flex-1">
								<div className="flex items-center gap-2">
									<Database size={16} className="text-emerald-500" />
									<span className={`text-sm font-medium ${text_heading}`}>
										Use existing dataset
									</span>
								</div>
								<p className={`text-xs ${text_muted} mt-1`}>
									Select a dataset from any of your other projects
								</p>
							</div>
						</label>

						{option === 'existing' && (
							<div className="pl-1">
								{is_loading_datasets ? (
									<div className="flex items-center justify-center py-6">
										<Loader2 size={18} className="animate-spin text-zinc-400" />
									</div>
								) : existing_datasets.length === 0 ? (
									<p className={`text-xs ${text_muted} py-3 text-center`}>
										No datasets found in other projects
									</p>
								) : (
									<div className="space-y-1 max-h-48 overflow-y-auto pr-1">
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
												</span>
											</button>
										))}
									</div>
								)}
							</div>
						)}
					</div>

					<div
						className={`px-5 py-3.5 border-t ${border_subtle} ${bg_subtle} rounded-b-xl flex items-center justify-end gap-3`}
					>
						<button
							onClick={on_close}
							disabled={is_importing}
							className={`px-3 py-2 text-sm font-medium rounded-lg ${hover_bg} transition-colors ${text_muted} disabled:opacity-50`}
						>
							Cancel
						</button>
						<button
							onClick={handle_confirm}
							disabled={
								is_importing || (option === 'existing' && !selected_ds_id) || is_loading_datasets
							}
							className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{is_importing ? (
								<>
									<Loader2 size={14} className="animate-spin" />
									Importing...
								</>
							) : (
								<>
									<Download size={14} />
									{option === 'new' ? 'Open Uploader' : 'Import Dataset'}
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</>
	)
}
