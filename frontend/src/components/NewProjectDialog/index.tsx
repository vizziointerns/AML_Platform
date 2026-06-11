import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Plus } from 'lucide-react'
import { supabase } from '../../utils/supabase'
import { upload_cover_image } from '../../utils/storage'
import { use_auth } from '../../contexts/auth_context'
import { use_project_store } from '../../store/projectStore'
import type { ProjectType } from '../../store/projectStore'
import CoverImageUploader from '../CoverImageUploader/index'
import { project_type_card as ProjectTypeCard } from './type_card'
import type { TypeCardOption } from './type_card'

const TYPE_OPTIONS: TypeCardOption[] = [
	{
		value: 'Object Detection',
		label: 'Object Detection',
		summary: 'Locate and classify objects within images',
		detail_title: 'Object Detection',
		detail_description:
			'Object Detection models identify and localize objects within an image using bounding boxes. Ideal for applications like autonomous driving, surveillance, and retail analytics.',
		detail_use_cases: ['Autonomous Driving', 'Surveillance', 'Retail Analytics', 'Robotics']
	},
	{
		value: 'Semantic Segmentation',
		label: 'Segmentation',
		summary: 'Pixel-level classification of scenes',
		detail_title: 'Segmentation',
		detail_description:
			'Segmentation assigns a class label to every pixel in an image, enabling scene understanding at the pixel level. Ideal for medical imaging, remote sensing, and autonomous navigation.',
		detail_use_cases: ['Medical Imaging', 'Remote Sensing', 'Scene Understanding', 'Agriculture']
	},
	{
		value: 'Instance Segmentation',
		label: 'Instance Segmentation',
		summary: 'Detect and segment each object instance',
		detail_title: 'Instance Segmentation',
		detail_description:
			'Instance Segmentation detects and segments each individual object instance. Perfect for advanced computer vision tasks requiring precise object boundaries.',
		detail_use_cases: ['Precision Agriculture', 'Manufacturing', 'Robotics', 'Medical Diagnosis']
	}
]

async function save_to_supabase(
	project_id: string,
	user_id: string,
	name_val: string,
	desc_val: string,
	type_val: string,
	cover_url?: string
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
		cover_image_url: cover_url ?? ''
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
	const [name, set_name] = useState('')
	const [description, set_description] = useState('')
	const [type, set_type] = useState<ProjectType>('Object Detection')
	const [name_error, set_name_error] = useState('')
	const [is_saving, set_is_saving] = useState(false)
	const [auth_error, set_auth_error] = useState('')
	const [cover_file, set_cover_file] = useState<File | undefined>()

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'

	if (!isOpen) return undefined

	const auth_alert = auth_error ? (
		<div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
			{auth_error}
		</div>
	) : undefined

	async function handle_submit() {
		const trimmed = name.trim()
		if (!trimmed) {
			set_name_error('Project name is required')
			return
		}

		if (!user) {
			set_auth_error('You must be signed in to create a project.')
			return
		}
		set_is_saving(true)

		const id = crypto.randomUUID()

		let cover_image_url = ''
		if (cover_file) {
			try {
				cover_image_url = await upload_cover_image(cover_file, id)
			} catch {
				set_is_saving(false)
				set_name_error('Failed to upload cover image. Please try again.')
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
			thumbnail: '',
			coverImageUrl: cover_image_url
		}

		const db_error_msg = await save_to_supabase(
			id,
			user.id,
			trimmed,
			description.trim(),
			type,
			cover_image_url
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
		set_cover_file(undefined)
		set_is_saving(false)
		on_close()
		navigate(`/projects/${id}/dashboard`)
	}

	return (
		<>
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
				onClick={on_close}
			/>
			<div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
				<div
					className={`pointer-events-auto w-full max-w-6xl max-h-[95vh] flex flex-col rounded-2xl shadow-2xl border ${border_subtle} ${bg_card} animate-in zoom-in-95 duration-300`}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault()
							handle_submit()
						}
					}}
				>
					<div
						className={`px-6 sm:px-8 py-4 sm:py-5 border-b ${border_subtle} flex justify-between items-center shrink-0`}
					>
						<div>
							<h2 className={`text-lg sm:text-xl font-semibold tracking-tight ${text_heading}`}>
								New Project
							</h2>
							<p className={`text-sm ${text_muted}`}>Create a new annotation project.</p>
						</div>
						<button
							className={`p-2 rounded-md ${hover_bg} transition-colors text-zinc-400`}
							onClick={on_close}
						>
							<X size={20} />
						</button>
					</div>

					<div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5 sm:py-6">
						{auth_alert}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							<div className="lg:col-span-1 space-y-5">
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
										rows={4}
										className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors resize-none
											${border_subtle}
											${is_dark_mode ? 'bg-zinc-950 text-zinc-100 placeholder:text-zinc-500' : 'bg-white text-zinc-900 placeholder:text-zinc-400'}
											focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50`}
									/>
								</div>

								<CoverImageUploader is_dark_mode={is_dark_mode} on_image_select={set_cover_file} />
							</div>

							<div className="lg:col-span-2 space-y-3">
								<div className="flex items-center justify-between">
									<label className={`text-sm font-medium ${text_heading}`}>
										Project Type <span className="text-red-500">*</span>
									</label>
									<span className={`text-xs ${text_muted}`}>{type}</span>
								</div>
								{TYPE_OPTIONS.length === 0 ? (
									<div
										className={`flex flex-col items-center gap-2 py-12 rounded-xl border ${border_subtle} ${bg_subtle}`}
									>
										<p className={`text-sm ${text_muted}`}>No project types defined</p>
									</div>
								) : (
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
										{TYPE_OPTIONS.map((opt) => (
											<ProjectTypeCard
												key={opt.value}
												option={opt}
												is_selected={type === opt.value}
												is_dark_mode={is_dark_mode}
												on_select={() => set_type(opt.value as ProjectType)}
											/>
										))}
									</div>
								)}
							</div>
						</div>
					</div>

					<div
						className={`px-6 sm:px-8 py-4 border-t ${border_subtle} ${bg_subtle} rounded-b-2xl flex justify-end gap-3 shrink-0`}
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
