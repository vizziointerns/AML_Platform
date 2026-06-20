import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Plus } from 'lucide-react'
import { supabase } from '../../utils/supabase'
import { use_auth } from '../../contexts/auth_context'
import { use_project_store } from '../../store/projectStore'
import type { ProjectType } from '../../store/projectStore'
import { use_google_auth } from '../../hooks/use_google_auth'
import { ensure_project_drive_folder } from '../../utils/google_drive'

const PROJECT_TYPES: ProjectType[] = [
	'Object Detection',
	'Semantic Segmentation',
	'Instance Segmentation',
	'Classification',
	'Keypoint Detection',
	'OCR',
	'Video Tracking',
	'3D Vision'
]

async function save_to_supabase(
	project_id: string,
	user_id: string,
	name_val: string,
	desc_val: string,
	type_val: string,
	drive_folder_id: string | undefined
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
		thumbnail: '',
		drive_folder_id
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

export default function new_project_dialog({
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
	const [name, set_name] = useState('')
	const [description, set_description] = useState('')
	const [type, set_type] = useState<ProjectType>('Object Detection')
	const [name_error, set_name_error] = useState('')
	const [is_saving, set_is_saving] = useState(false)
	const [auth_error, set_auth_error] = useState('')
	const [is_pending_submit, set_is_pending_submit] = useState(false)

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'

	const auth_alert = auth_error ? (
		<div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
			{auth_error}
		</div>
	) : undefined

	const handle_submit = useCallback(async () => {
		const trimmed = name.trim()
		if (!trimmed) {
			set_name_error('Project name is required')
			return
		}

		if (!user) {
			set_auth_error('You must be signed in to create a project.')
			return
		}

		if (google_auth.is_configured && !google_auth.is_authenticated) {
			if (google_auth.is_loading) return
			set_is_pending_submit(true)
			google_auth.sign_in()
			return
		}

		set_is_saving(true)
		set_is_pending_submit(false)

		const id = crypto.randomUUID()
		let drive_folder_id: string | undefined

		if (google_auth.is_authenticated && google_auth.access_token) {
			try {
				drive_folder_id = await ensure_project_drive_folder({
					access_token: google_auth.access_token,
					project_id: id,
					project_name: trimmed
				})
			} catch (error) {
				set_is_saving(false)
				set_name_error(
					error instanceof Error ? error.message : 'Failed to create Google Drive folder'
				)
				return
			}
		}

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

		const db_error_msg = await save_to_supabase(
			id,
			user.id,
			trimmed,
			description.trim(),
			type,
			drive_folder_id
		)
		if (db_error_msg) {
			set_is_saving(false)
			set_name_error(db_error_msg)
			return
		}

		add_project(project)

		set_name('')
		set_description('')
		set_type('Object Detection')
		set_name_error('')
		set_auth_error('')
		set_is_saving(false)
		on_close()
		navigate(`/projects/${id}/dashboard`)
	}, [name, description, type, user, google_auth, add_project, on_close, navigate, name_error])

	useEffect(() => {
		if (is_pending_submit && google_auth.is_authenticated && !is_saving) {
			void handle_submit()
		}
	}, [is_pending_submit, google_auth.is_authenticated, is_saving, handle_submit])

	useEffect(() => {
		if (!google_auth.error) return

		set_is_pending_submit(false)
		set_is_saving(false)
		set_auth_error(google_auth.error)
	}, [google_auth.error])

	if (!isOpen) return undefined

	return (
		<>
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
				onClick={on_close}
			/>
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
				<div
					className={`pointer-events-auto w-full max-w-lg rounded-xl shadow-2xl border ${border_subtle} ${bg_card} animate-in zoom-in-95 duration-300`}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault()
							handle_submit()
						}
					}}
				>
					<div className={`px-6 py-4 border-b ${border_subtle} flex justify-between items-center`}>
						<div>
							<h2 className={`text-lg font-semibold tracking-tight ${text_heading}`}>
								New Project
							</h2>
							<p className={`text-sm ${text_muted}`}>Create a new annotation project.</p>
						</div>
						<button
							className={`p-2 rounded-md ${hover_bg} transition-colors text-zinc-400`}
							onClick={on_close}
						>
							<X size={18} />
						</button>
					</div>

					<div className="px-6 py-6 space-y-5">
						{auth_alert}
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
									${is_dark_mode ? 'bg-zinc-950 text-zinc-100 placeholder:text-zinc-500' : 'bg-white text-zinc-900 placeholder:text-zinc-400'}
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
									${is_dark_mode ? 'bg-zinc-950 text-zinc-100 placeholder:text-zinc-500' : 'bg-white text-zinc-900 placeholder:text-zinc-400'}
									focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50`}
							/>
						</div>

						<div className="space-y-1.5">
							<label className={`text-sm font-medium ${text_heading}`}>
								Project Type <span className="text-red-500">*</span>
							</label>
							<select
								value={type}
								onChange={(e) => set_type(e.target.value as ProjectType)}
								className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
									${border_subtle}
									${is_dark_mode ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'}
									focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50`}
							>
								{PROJECT_TYPES.map((t) => (
									<option key={t} value={t}>
										{t}
									</option>
								))}
							</select>
						</div>
					</div>

					<div
						className={`px-6 py-4 border-t ${border_subtle} ${bg_subtle} rounded-b-xl flex justify-end gap-3`}
					>
						<button
							onClick={on_close}
							disabled={is_saving}
							className={`px-4 py-2.5 text-sm font-medium rounded-lg ${hover_bg} transition-colors ${text_heading} disabled:opacity-50`}
						>
							Cancel
						</button>
						<button
							onClick={handle_submit}
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
				</div>
			</div>
		</>
	)
}
