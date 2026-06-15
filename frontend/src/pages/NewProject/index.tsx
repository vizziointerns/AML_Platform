import { useState, useCallback, Component, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/supabase'
import { use_auth } from '../../contexts/auth_context'
import { use_project_store, type ProjectType } from '../../store/projectStore'
import { use_app_context } from '../../contexts/app_context'
import { use_datasets } from '../../hooks/use_datasets'
import { project_type_card, ICON_3D } from '../../components/ProjectTypeCard'
import { dataset_options_panel } from '../../components/DatasetOptionsPanel'
import { CheckCircle2, Plus, ArrowLeft } from 'lucide-react'

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

class PageErrorBoundary extends Component<
	{ children: ReactNode; is_dark_mode: boolean },
	{ has_error: boolean }
> {
	state = { has_error: false }

	static getDerivedStateFromError() {
		return { has_error: true }
	}

	override render() {
		if (this.state.has_error) {
			const bg = this.props.is_dark_mode
				? 'bg-zinc-900 border-zinc-800'
				: 'bg-white border-zinc-200'
			const tm = this.props.is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
			return (
				<div className="page-layout">
					<div className="page-content">
						<div className={`rounded-xl border ${bg} p-12 text-center`}>
							<h2 className="text-lg font-semibold mb-2">New Project Page failed to load</h2>
							<p className={`text-sm ${tm}`}>
								An unexpected error occurred. Please try refreshing the page.
							</p>
						</div>
					</div>
				</div>
			)
		}
		return this.props.children
	}
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

function back_button(on_back: () => void, text_muted: string, hover_bg: string) {
	return (
		<button
			onClick={on_back}
			className={`inline-flex items-center gap-1.5 text-sm font-medium ${text_muted} ${hover_bg} px-3 py-1.5 rounded-lg transition-colors`}
		>
			<ArrowLeft size={16} />
			Back to Projects
		</button>
	)
}

function card_header(
	is_post: boolean,
	text_heading: string,
	text_muted: string,
	border_subtle: string
) {
	return (
		<div className={`px-6 py-4 border-b ${border_subtle} flex items-center gap-3`}>
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
		</div>
	)
}

function render_form_body(
	name: string,
	name_error: string,
	on_name_change: (v: string) => void,
	description: string,
	on_desc_change: (v: string) => void,
	type: ProjectType,
	on_type_change: (t: ProjectType) => void,
	is_dark_mode: boolean,
	text_heading: string,
	border_subtle: string
) {
	const th = text_heading
	const bg_input = is_dark_mode
		? 'bg-zinc-950 text-zinc-100 placeholder:text-zinc-500'
		: 'bg-white text-zinc-900 placeholder:text-zinc-400'

	const type_cards = (
		<div className="space-y-10">
			<label className={`text-sm font-medium ${th}`}>
				Project Type <span className="text-red-500">*</span>
			</label>
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4" onClick={(e) => e.stopPropagation()}>
				{PROJECT_TYPE_META.map((meta) =>
					project_type_card({
						title: meta.title,
						description: meta.description,
						icon3d: meta.icon3d,
						is_selected: type === meta.type,
						on_select: () => on_type_change(meta.type),
						is_dark_mode
					})
				)}
			</div>
		</div>
	)

	return (
		<div className="px-6 py-6 space-y-6">
			<div className="space-y-1.5">
				<label className={`text-sm font-medium ${th}`}>
					Project Name <span className="text-red-500">*</span>
				</label>
				<input
					type="text"
					value={name}
					onChange={(e) => on_name_change(e.target.value)}
					placeholder="e.g. Autonomous Driving Pedestrians"
					className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${border_subtle} ${bg_input} focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 ${name_error ? 'border-red-500' : ''}`}
				/>
				{name_error && <p className="text-xs text-red-500">{name_error}</p>}
			</div>

			<div className="space-y-1.5">
				<label className={`text-sm font-medium ${th}`}>Description</label>
				<textarea
					value={description}
					onChange={(e) => on_desc_change(e.target.value)}
					placeholder="Brief description of your project..."
					rows={3}
					className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors resize-none ${border_subtle} ${bg_input} focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50`}
				/>
			</div>

			{type_cards}
		</div>
	)
}

function render_form_footer(
	on_cancel: () => void,
	on_submit: () => void,
	is_saving: boolean,
	border_subtle: string,
	bg_subtle: string,
	hover_bg: string,
	text_heading: string
) {
	return (
		<div
			className={`px-6 py-4 border-t ${border_subtle} ${bg_subtle} rounded-b-xl flex justify-end gap-3`}
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

export default function new_project_page() {
	const navigate = useNavigate()
	const { is_dark_mode } = use_app_context()
	const { user } = use_auth()
	const projects = use_project_store((s) => s.projects)
	const add_project = use_project_store((s) => s.addProject)

	const [name, set_name] = useState('')
	const [description, set_description] = useState('')
	const [type, set_type] = useState<ProjectType>('Object Detection')
	const [name_error, set_name_error] = useState('')
	const [is_saving, set_is_saving] = useState(false)

	const [created_project_id, set_created_project_id] = useState<string | undefined>(undefined)
	const { datasets } = use_datasets(created_project_id)

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'

	const handle_submit = useCallback(async () => {
		const trimmed = name.trim()
		if (!trimmed) {
			set_name_error('Project name is required')
			return
		}
		if (projects.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
			set_name_error(`A project named "${trimmed}" already exists. Please choose a different name.`)
			return
		}
		if (!user) return

		set_is_saving(true)

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

		set_is_saving(false)
		set_name('')
		set_description('')
		set_name_error('')
		set_created_project_id(id)
	}, [name, description, type, user, projects, add_project])

	const handle_options_complete = useCallback(() => {
		set_created_project_id(undefined)
		navigate('/projects')
	}, [navigate])

	const is_post_creation = !!created_project_id

	const panel = dataset_options_panel({
		project_id: created_project_id ?? '',
		datasets,
		is_dark_mode,
		on_complete: handle_options_complete,
		is_visible: is_post_creation
	})

	return (
		<PageErrorBoundary is_dark_mode={is_dark_mode}>
			<div className="page-layout">
				<div className="page-content">
					{back_button(() => navigate('/projects'), text_muted, hover_bg)}

					<div className={`rounded-xl border ${border_subtle} ${bg_card} overflow-hidden`}>
						{card_header(is_post_creation, text_heading, text_muted, border_subtle)}

						{is_post_creation ? (
							<div className="px-6 py-6">{panel}</div>
						) : (
							<>
								{render_form_body(
									name,
									name_error,
									(v) => {
										set_name(v)
										if (name_error) set_name_error('')
									},
									description,
									set_description,
									type,
									set_type,
									is_dark_mode,
									text_heading,
									border_subtle
								)}
								{render_form_footer(
									() => navigate('/projects'),
									handle_submit,
									is_saving,
									border_subtle,
									bg_subtle,
									hover_bg,
									text_heading
								)}
							</>
						)}
					</div>
				</div>
			</div>
		</PageErrorBoundary>
	)
}
