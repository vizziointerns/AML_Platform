import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Upload, Plus, Check, File, X } from 'lucide-react'
import { supabase } from '../../utils/supabase'
import { upload_file } from '../../api/upload'
import type { DatasetInfo } from '../../hooks/use_datasets'

export type DatasetOption = 'use_existing' | 'upload_existing' | 'create_new'

function file_upload_area(
	files: File[],
	on_files_selected: (files: File[]) => void,
	on_remove_file: (index: number) => void,
	is_dark_mode: boolean
) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const border_subtle = is_dark_mode ? 'border-zinc-700' : 'border-zinc-300'
	const hover_border = is_dark_mode ? 'hover:border-blue-500/50' : 'hover:border-blue-500/50'
	const drop_bg = is_dark_mode ? 'bg-zinc-800/30' : 'bg-zinc-50'

	return (
		<div className="space-y-2">
			<label
				className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all ${drop_bg} ${border_subtle} ${hover_border}`}
			>
				<div className={`p-3 rounded-full ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
					<Upload size={22} className={text_muted} />
				</div>
				<div className="text-center">
					<p className={`text-sm font-medium ${text_heading}`}>Click to select files</p>
					<p className={`text-xs ${text_muted} mt-0.5`}>Images or .zip archives</p>
				</div>
				<input
					type="file"
					multiple
					accept="image/*,.zip"
					className="hidden"
					onChange={(e) => {
						if (e.target.files && e.target.files.length > 0) {
							on_files_selected(Array.from(e.target.files))
							e.target.value = ''
						}
					}}
				/>
			</label>

			{files.length > 0 && (
				<div
					className={`rounded-xl border ${is_dark_mode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50/50'} overflow-hidden`}
				>
					<div
						className={`px-4 py-2 border-b ${is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'} flex items-center justify-between`}
					>
						<span className={`text-xs font-medium ${text_muted}`}>
							{files.length} file{files.length !== 1 ? 's' : ''} selected
						</span>
					</div>
					<div className="max-h-32 overflow-y-auto divide-y divide-dashed">
						{files.map((f, i) => (
							<div key={i} className="flex items-center gap-3 px-4 py-2">
								<File size={14} className={`shrink-0 ${text_muted}`} />
								<div className="flex-1 min-w-0">
									<p className={`text-xs truncate ${text_heading}`}>{f.name}</p>
									<p className={`text-[10px] ${text_muted}`}>{(f.size / 1024).toFixed(1)} KB</p>
								</div>
								<button
									type="button"
									onClick={() => on_remove_file(i)}
									className={`p-1 rounded-md ${text_muted} hover:text-red-500 ${is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'} transition-colors`}
								>
									<X size={14} />
								</button>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

function ds_select(
	id: string,
	datasets: DatasetInfo[],
	on_change: (v: string) => void,
	is_dark_mode: boolean
) {
	const b = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'

	if (datasets.length === 0) {
		return undefined
	}

	return (
		<select
			value={id || ''}
			onChange={(e) => on_change(e.target.value)}
			className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-blue-500 ${b} ${is_dark_mode ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-900'}`}
		>
			{datasets.map((ds) => (
				<option key={ds.id} value={ds.id}>
					{ds.name}
				</option>
			))}
		</select>
	)
}

function no_datasets_msg(is_dark_mode: boolean) {
	return (
		<div
			className={`rounded-lg border ${is_dark_mode ? 'border-zinc-800 bg-zinc-800/30' : 'border-zinc-200 bg-zinc-50'} px-4 py-3 text-center`}
		>
			<p className={`text-xs ${is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'}`}>
				No datasets yet. Create one below or skip for now.
			</p>
		</div>
	)
}

function opt_card(
	option: DatasetOption,
	selected: DatasetOption | undefined,
	icon: React.ReactNode,
	title: string,
	desc: string,
	on_click: () => void,
	children: React.ReactNode,
	is_dark_mode: boolean
) {
	const b = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const th = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const sb = 'ring-2 ring-blue-500 border-blue-500'
	const is_sel = selected === option

	return (
		<button
			type="button"
			onClick={on_click}
			className={`w-full text-left rounded-xl border p-4 transition-all ${bg} ${is_sel ? sb : b}`}
		>
			<div className="flex items-start gap-3">
				<div className="flex items-start gap-3 flex-1 min-w-0">
					{icon}
					<div className="flex-1 min-w-0">
						<span className={`text-sm font-medium ${th}`}>{title}</span>
						<p className={`text-xs mt-0.5 ${is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'}`}>
							{desc}
						</p>
					</div>
				</div>
				{is_sel && <Check size={18} className="text-blue-500 shrink-0 mt-1" />}
			</div>
			{is_sel && children && (
				<div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
					{children}
				</div>
			)}
		</button>
	)
}

function icon_wrap(icon: React.ReactNode, color: string) {
	return <div className={`p-2 rounded-lg shrink-0 ${color}`}>{icon}</div>
}

function action_btns(
	sel: DatasetOption | undefined,
	is_proc: boolean,
	on_skip: () => void,
	on_action: () => void,
	is_dark_mode: boolean
) {
	if (!sel) return undefined
	const th = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const hb = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'

	const label =
		sel === 'use_existing'
			? 'Go to Dashboard'
			: sel === 'upload_existing'
				? 'Upload & Go to Dashboard'
				: 'Create & Go to Dashboard'

	return (
		<div className="flex justify-end gap-3">
			<button
				type="button"
				onClick={on_skip}
				className={`px-4 py-2 text-sm font-medium rounded-lg ${hb} transition-colors ${th}`}
			>
				Skip — Go to Dashboard
			</button>
			<button
				type="button"
				onClick={on_action}
				disabled={is_proc}
				className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{is_proc ? (
					<>
						<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
						Processing...
					</>
				) : (
					label
				)}
			</button>
		</div>
	)
}

/* ── Hooked component ── */

interface DatasetOptionsPanelProps {
	project_id: string
	datasets: DatasetInfo[]
	is_dark_mode: boolean
	on_complete: () => void
	is_visible: boolean
}

export function dataset_options_panel({
	project_id,
	datasets,
	is_dark_mode,
	on_complete,
	is_visible
}: DatasetOptionsPanelProps) {
	const navigate = useNavigate()
	const [selected_option, set_selected_option] = useState<DatasetOption | undefined>(undefined)
	const [selected_dataset_id, set_selected_dataset_id] = useState('')
	const [new_dataset_name, set_new_dataset_name] = useState('')
	const [new_dataset_name_error, set_new_dataset_name_error] = useState<string | undefined>(
		undefined
	)
	const [upload_files, set_upload_files] = useState<File[]>([])
	const [new_dataset_files, set_new_dataset_files] = useState<File[]>([])
	const [is_processing, set_is_processing] = useState(false)

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'

	useEffect(() => {
		if (!is_visible) return
		if (!selected_dataset_id && datasets.length > 0) {
			set_selected_dataset_id(datasets[0]!.id)
		}
	}, [datasets, selected_dataset_id, is_visible])

	const h_file_change = useCallback((files: File[]) => {
		set_upload_files((prev) => [...prev, ...files])
	}, [])

	const h_remove_file = useCallback((index: number) => {
		set_upload_files((prev) => prev.filter((_, i) => i !== index))
	}, [])

	const h_new_dataset_file_change = useCallback((files: File[]) => {
		set_new_dataset_files((prev) => [...prev, ...files])
	}, [])

	const h_remove_new_dataset_file = useCallback((index: number) => {
		set_new_dataset_files((prev) => prev.filter((_, i) => i !== index))
	}, [])

	const h_use_existing = useCallback(async () => {
		navigate(`/projects/${project_id}/dashboard`)
		on_complete()
	}, [project_id, navigate, on_complete])

	const h_upload_existing = useCallback(async () => {
		if (!selected_dataset_id) return
		try {
			await Promise.allSettled(
				upload_files.map((file) => {
					const fo = {
						id: crypto.randomUUID(),
						file,
						name: file.name,
						size: file.size,
						progress: 0,
						status: 'pending' as const
					}
					return upload_file(fo, selected_dataset_id, {
						on_progress: () => {},
						on_complete: () => {},
						on_error: () => {}
					})
				})
			)
		} catch {
			/* silent */
		}
		navigate(`/projects/${project_id}/dashboard`)
		on_complete()
	}, [selected_dataset_id, upload_files, project_id, navigate, on_complete])

	const h_create_new = useCallback(async () => {
		const trimmed = new_dataset_name.trim()
		if (!trimmed) {
			set_new_dataset_name_error('Dataset name is required')
			return
		}
		set_new_dataset_name_error(undefined)
		const { error: err } = await supabase.from('datasets').insert({
			project_id,
			name: trimmed,
			description: undefined,
			status: 'Processing',
			image_count: 0,
			class_count: 0,
			tags: [],
			storage_bytes: 0
		})
		if (err) {
			set_new_dataset_name_error(err.message)
			return
		}
		navigate(`/projects/${project_id}/dashboard`)
		on_complete()
	}, [new_dataset_name, project_id, navigate, on_complete])

	const h_action = useCallback(async () => {
		set_is_processing(true)
		if (selected_option === 'use_existing') await h_use_existing()
		else if (selected_option === 'upload_existing') await h_upload_existing()
		else if (selected_option === 'create_new') await h_create_new()
		set_is_processing(false)
	}, [selected_option, h_use_existing, h_upload_existing, h_create_new])

	if (!is_visible) return undefined

	const has_datasets = datasets.length > 0

	return (
		<div className="space-y-5">
			<div className="space-y-1">
				<h3
					className={`text-base font-semibold ${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'}`}
				>
					Dataset Management
				</h3>
				<p className={`text-sm ${text_muted}`}>
					Choose how you would like to manage datasets for this project.
				</p>
			</div>

			{opt_card(
				'use_existing',
				selected_option,
				icon_wrap(
					<FolderOpen size={20} className="text-blue-500" />,
					is_dark_mode ? 'bg-blue-500/10' : 'bg-blue-50'
				),
				'Use existing dataset',
				'Select from datasets already available in this project.',
				() => {
					set_selected_option('use_existing')
					if (has_datasets && !selected_dataset_id) set_selected_dataset_id(datasets[0]!.id)
				},
				has_datasets
					? ds_select(selected_dataset_id, datasets, set_selected_dataset_id, is_dark_mode)
					: no_datasets_msg(is_dark_mode),
				is_dark_mode
			)}

			{opt_card(
				'upload_existing',
				selected_option,
				icon_wrap(
					<Upload size={20} className="text-emerald-500" />,
					is_dark_mode ? 'bg-emerald-500/10' : 'bg-emerald-50'
				),
				'Upload to existing dataset',
				'Choose a target dataset and upload new files to it.',
				() => {
					set_selected_option('upload_existing')
					if (has_datasets && !selected_dataset_id) set_selected_dataset_id(datasets[0]!.id)
				},
				<>
					{has_datasets ? (
						<>
							<label className={`block text-xs font-medium ${text_muted} mb-1`}>
								Target Dataset
							</label>
							{ds_select(selected_dataset_id, datasets, set_selected_dataset_id, is_dark_mode)}
						</>
					) : (
						no_datasets_msg(is_dark_mode)
					)}
					{file_upload_area(upload_files, h_file_change, h_remove_file, is_dark_mode)}
				</>,
				is_dark_mode
			)}

			{opt_card(
				'create_new',
				selected_option,
				icon_wrap(
					<Plus size={20} className="text-violet-500" />,
					is_dark_mode ? 'bg-violet-500/10' : 'bg-violet-50'
				),
				'Create new dataset',
				'Create a fresh dataset and optionally upload files to it.',
				() => set_selected_option('create_new'),
				<>
					<div className="space-y-1.5">
						<label className={`block text-xs font-medium ${text_muted}`}>
							Dataset Name <span className="text-red-500">*</span>
						</label>
						<input
							type="text"
							value={new_dataset_name}
							onChange={(e) => {
								set_new_dataset_name(e.target.value)
								if (new_dataset_name_error) set_new_dataset_name_error(undefined)
							}}
							placeholder="e.g. Training Set v1"
							className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors focus:border-blue-500 ${border_subtle} ${is_dark_mode ? 'bg-zinc-950 text-zinc-100 placeholder:text-zinc-500' : 'bg-white text-zinc-900 placeholder:text-zinc-400'} ${new_dataset_name_error ? 'border-red-500' : ''}`}
						/>
						{new_dataset_name_error && (
							<p className="text-xs text-red-500">{new_dataset_name_error}</p>
						)}
					</div>
					<div className="space-y-1">
						<p className={`text-xs font-medium ${text_muted}`}>Upload files (optional)</p>
						{file_upload_area(
							new_dataset_files,
							h_new_dataset_file_change,
							h_remove_new_dataset_file,
							is_dark_mode
						)}
					</div>
				</>,
				is_dark_mode
			)}

			{action_btns(
				selected_option,
				is_processing,
				() => {
					navigate(`/projects/${project_id}/dashboard`)
					on_complete()
				},
				h_action,
				is_dark_mode
			)}
		</div>
	)
}
