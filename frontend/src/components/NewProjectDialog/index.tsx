import { useState, useCallback } from 'react'
import { X, Plus, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../utils/supabase'
import { use_auth } from '../../contexts/auth_context'
import { use_project_store } from '../../store/projectStore'
import { use_datasets } from '../../hooks/use_datasets'
import { project_type_card, ICON_3D } from '../ProjectTypeCard'
import { dataset_upload_form } from '../DatasetUploadForm'
import { dataset_options_panel } from '../DatasetOptionsPanel'
import type { ProjectType } from '../../store/projectStore'

interface TypeMeta {
	title: string
	type: ProjectType
	icon3d: React.ReactNode
	description: string
}

const PROJECT_TYPE_META: TypeMeta[] = [
	{
		title: 'Object Detection',
		type: 'Object Detection',
		icon3d: ICON_3D.object_detection(),
		description:
			'Identify and locate objects within images using bounding boxes and class labels. Ideal for autonomous driving, retail analytics, and security.'
	},
	{
		title: 'Segmentation',
		type: 'Semantic Segmentation',
		icon3d: ICON_3D.segmentation(),
		description:
			'Assign pixel-level labels to classify every region of the image. Best for medical imaging, satellite imagery, and scene understanding.'
	},
	{
		title: 'Instance Segmentation',
		type: 'Instance Segmentation',
		icon3d: ICON_3D.instance_segmentation(),
		description:
			'Detect individual object instances with pixel-accurate masks. Perfect for precision agriculture, manufacturing QA, and robotics.'
	}
]

interface SelectedFile {
	id: string
	name: string
	size: number
}

async function save_to_supabase(
	project_id: string,
	user_id: string,
	name_val: string,
	desc_val: string,
	type_val: string
): Promise<string | undefined> {
	const { error: db_error } = await supabase.from('projects').insert({
		id: project_id,
		user_id,
		name: name_val,
		description: desc_val,
		type: type_val,
		status: 'Active',
		dataset_count: 0,
		annotation_progress: 0,
		members: [],
		last_updated: Date.now(),
		is_pinned: false,
		is_favorite: false,
		thumbnail: ''
	})
	if (!db_error) return undefined
	if (
		db_error.message?.includes('does not exist') ||
		db_error.message?.includes('Could not find the table')
	) {
		return undefined
	}
	return db_error.message
}

/* ── Pure render helpers (no hooks) ── */

function form_header(
	is_post: boolean,
	text_heading: string,
	text_muted: string,
	border_subtle: string,
	hover_bg: string,
	on_close: () => void
) {
	return (
		<div className={`px-6 py-4 border-b ${border_subtle} flex items-center gap-3 shrink-0`}>
			{is_post && <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />}
			<div className="flex-1">
				<h2 className={`text-lg font-semibold tracking-tight ${text_heading}`}>
					{is_post ? 'Project Created' : 'New Project'}
				</h2>
				<p className={`text-sm ${text_muted}`}>
					{is_post
						? 'Your project is ready. Manage datasets below.'
						: 'Create a new annotation project.'}
				</p>
			</div>
			<button
				className={`p-2 rounded-md ${hover_bg} transition-colors text-zinc-400`}
				onClick={on_close}
			>
				<X size={18} />
			</button>
		</div>
	)
}

function name_field(
	name: string,
	name_error: string,
	on_change: (v: string) => void,
	is_dark_mode: boolean,
	border_subtle: string
) {
	return (
		<div className="space-y-1.5">
			<label className={`text-sm font-medium ${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'}`}>
				Project Name <span className="text-red-500">*</span>
			</label>
			<input
				type="text"
				value={name}
				onChange={(e) => on_change(e.target.value)}
				placeholder="e.g. Autonomous Driving Pedestrians"
				className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${border_subtle} ${is_dark_mode ? 'bg-zinc-950 text-zinc-100 placeholder:text-zinc-500' : 'bg-white text-zinc-900 placeholder:text-zinc-400'} focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 ${name_error ? 'border-red-500' : ''}`}
			/>
			{name_error && <p className="text-xs text-red-500">{name_error}</p>}
		</div>
	)
}

function desc_field(
	description: string,
	on_change: (v: string) => void,
	is_dark_mode: boolean,
	border_subtle: string
) {
	return (
		<div className="space-y-1.5">
			<label className={`text-sm font-medium ${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'}`}>
				Description
			</label>
			<textarea
				value={description}
				onChange={(e) => on_change(e.target.value)}
				placeholder="Brief description of your project..."
				rows={3}
				className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors resize-none ${border_subtle} ${is_dark_mode ? 'bg-zinc-950 text-zinc-100 placeholder:text-zinc-500' : 'bg-white text-zinc-900 placeholder:text-zinc-400'} focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50`}
			/>
		</div>
	)
}

function type_cards(type: ProjectType, set_type: (t: ProjectType) => void, is_dark_mode: boolean) {
	return (
		<div className="space-y-10">
			<label className={`text-sm font-medium ${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'}`}>
				Project Type <span className="text-red-500">*</span>
			</label>
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				{PROJECT_TYPE_META.map((meta) =>
					project_type_card({
						title: meta.title,
						description: meta.description,
						icon3d: meta.icon3d,
						is_selected: type === meta.type,
						on_select: () => set_type(meta.type),
						is_dark_mode
					})
				)}
			</div>
		</div>
	)
}

function form_footer(
	is_saving: boolean,
	on_cancel: () => void,
	on_submit: () => void,
	border_subtle: string,
	bg_subtle: string,
	hover_bg: string,
	text_heading: string
) {
	return (
		<div
			className={`px-6 py-4 border-t ${border_subtle} ${bg_subtle} rounded-b-xl flex justify-end gap-3 shrink-0`}
		>
			<button
				onClick={on_cancel}
				disabled={is_saving}
				className={`px-4 py-2.5 text-sm font-medium rounded-lg ${hover_bg} transition-colors ${text_heading} disabled:opacity-50`}
			>
				Cancel
			</button>
			<button
				onClick={on_submit}
				disabled={is_saving}
				className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{is_saving ? (
					<>
						<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
						Creating...
					</>
				) : (
					<>
						<Plus size={16} />
						Create Project
					</>
				)}
			</button>
		</div>
	)
}

export default function new_project_dialog({
	isOpen,
	on_close,
	is_dark_mode
}: {
	isOpen: boolean
	on_close: () => void
	is_dark_mode: boolean
}) {
	const { user } = use_auth()
	const add_project = use_project_store((s) => s.addProject)

	const [name, set_name] = useState('')
	const [description, set_description] = useState('')
	const [type, set_type] = useState<ProjectType>('Object Detection')
	const [name_error, set_name_error] = useState('')
	const [is_saving, set_is_saving] = useState(false)
	const [auth_error, set_auth_error] = useState('')

	const [is_upload_enabled, set_is_upload_enabled] = useState(false)
	const [dataset_name, set_dataset_name] = useState('')
	const [dataset_name_error, set_dataset_name_error] = useState<string | undefined>(undefined)
	const [selected_files, set_selected_files] = useState<SelectedFile[]>([])

	const [created_project_id, set_created_project_id] = useState<string | undefined>(undefined)
	const { datasets } = use_datasets(created_project_id)

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'

	const handle_files_selected = useCallback((files: File[]) => {
		set_selected_files((prev) => [
			...prev,
			...files.map((f) => ({ id: crypto.randomUUID(), name: f.name, size: f.size }))
		])
	}, [])

	const handle_remove_file = useCallback((id: string) => {
		set_selected_files((prev) => prev.filter((f) => f.id !== id))
	}, [])

	const handle_submit = useCallback(async () => {
		const trimmed = name.trim()
		if (!trimmed) {
			set_name_error('Project name is required')
			return
		}
		if (is_upload_enabled && !dataset_name.trim()) {
			set_dataset_name_error('Dataset name is required when uploading')
			return
		}
		if (!user) {
			set_auth_error('You must be signed in to create a project.')
			return
		}

		set_is_saving(true)
		set_dataset_name_error(undefined)

		const id = crypto.randomUUID()
		const project = {
			id,
			name: trimmed,
			description: description.trim(),
			type,
			datasetCount: 0,
			annotationProgress: 0,
			members: [],
			lastUpdated: Date.now(),
			status: 'Active' as const,
			isPinned: false,
			isFavorite: false,
			thumbnail: ''
		}

		const db_error_msg = await save_to_supabase(id, user.id, trimmed, description.trim(), type)
		if (db_error_msg) {
			set_is_saving(false)
			set_name_error(db_error_msg)
			return
		}

		add_project(project)

		if (is_upload_enabled && dataset_name.trim()) {
			await supabase.from('datasets').insert({
				project_id: id,
				name: dataset_name.trim(),
				description: undefined,
				status: 'Processing',
				image_count: 0,
				class_count: 0,
				tags: [],
				storage_bytes: 0
			})
		}

		set_is_saving(false)
		set_name('')
		set_description('')
		set_name_error('')
		set_auth_error('')
		set_selected_files([])
		set_dataset_name('')
		set_created_project_id(id)
	}, [name, description, type, is_upload_enabled, dataset_name, user, add_project])

	const handle_options_complete = useCallback(() => {
		set_created_project_id(undefined)
		set_is_upload_enabled(false)
		set_dataset_name('')
		set_dataset_name_error(undefined)
		on_close()
	}, [on_close])

	// Always call dataset_options_panel for stable hook ordering — result is conditionally rendered
	// This MUST be before the `!isOpen` early return so hooks stay consistent across all renders.
	const is_post_creation = !!created_project_id
	const panel = dataset_options_panel({
		project_id: created_project_id ?? '',
		datasets,
		is_dark_mode,
		on_complete: handle_options_complete,
		is_visible: is_post_creation
	})

	if (!isOpen) return undefined

	const auth_alert = auth_error ? (
		<div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
			{auth_error}
		</div>
	) : undefined

	return (
		<>
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
				onClick={is_post_creation ? handle_options_complete : on_close}
			/>
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
				<div
					className={`pointer-events-auto rounded-xl shadow-2xl border ${border_subtle} ${bg_card} animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto ${is_post_creation ? 'w-full max-w-xl' : 'w-full max-w-2xl flex flex-col'}`}
					onClick={(e) => e.stopPropagation()}
				>
					{form_header(
						is_post_creation,
						text_heading,
						text_muted,
						border_subtle,
						hover_bg,
						is_post_creation ? handle_options_complete : on_close
					)}

					{is_post_creation ? (
						<div className="px-6 py-6">{panel}</div>
					) : (
						<>
							<div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
								{auth_alert}
								{name_field(
									name,
									name_error,
									(v) => {
										set_name(v)
										if (name_error) set_name_error('')
									},
									is_dark_mode,
									border_subtle
								)}
								{desc_field(description, set_description, is_dark_mode, border_subtle)}
								{type_cards(type, set_type, is_dark_mode)}
								{dataset_upload_form({
									is_enabled: is_upload_enabled,
									on_toggle_enabled: () => set_is_upload_enabled((prev) => !prev),
									dataset_name,
									on_dataset_name_change: (v) => {
										set_dataset_name(v)
										if (dataset_name_error) set_dataset_name_error(undefined)
									},
									dataset_name_error,
									selected_files,
									on_files_selected: handle_files_selected,
									on_remove_file: handle_remove_file,
									is_dark_mode
								})}
							</div>
							{form_footer(
								is_saving,
								on_close,
								handle_submit,
								border_subtle,
								bg_subtle,
								hover_bg,
								text_heading
							)}
						</>
					)}
				</div>
			</div>
		</>
	)
}
