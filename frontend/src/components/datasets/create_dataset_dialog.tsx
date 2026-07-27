import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import { X } from 'lucide-react'
import { use_google_auth } from '../../hooks/use_google_auth'
import { ensure_new_dataset_drive_folder } from '../../utils/google_drive'

function get_dataset_tags(tags_input: string): string[] {
	return tags_input
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean)
}

async function resolve_dataset_drive_folder_id(params: {
	project_id: string
	dataset_name: string
	google_access_token: string | undefined
}): Promise<string | undefined> {
	const { project_id, dataset_name, google_access_token } = params
	if (!google_access_token) return undefined

	return ensure_new_dataset_drive_folder(google_access_token, project_id, dataset_name)
}

export function CreateDatasetDialog({
	is_open,
	on_close,
	project_id,
	is_dark_mode,
	on_created
}: {
	is_open: boolean
	on_close: () => void
	project_id: string | undefined
	is_dark_mode: boolean
	on_created: () => void
}) {
	const [name, set_name] = useState('')
	const [description, set_description] = useState('')
	const [tags_input, set_tags_input] = useState('')
	const [is_saving, set_is_saving] = useState(false)
	const [error, set_error] = useState<string | undefined>()
	const [is_pending_save, set_is_pending_save] = useState(false)
	const google_auth = use_google_auth()

	const bg_overlay = is_dark_mode ? 'bg-black/60' : 'bg-black/40'
	const bg_card = is_dark_mode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const input_bg = is_dark_mode
		? 'bg-zinc-800 border-zinc-700 text-zinc-100'
		: 'bg-zinc-50 border-zinc-300 text-zinc-900'
	const close_btn_hover = is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'

	const handle_save = async () => {
		const trimmed_name = name.trim()

		if (!trimmed_name) {
			set_error('Dataset name is required')
			return
		}

		if (!project_id) {
			set_error('No project selected')
			return
		}

		/* if Drive is configured but not authenticated, popup once then resume */
		if (google_auth.is_configured && !google_auth.is_authenticated) {
			if (!google_auth.is_loading) {
				set_is_pending_save(true)
				google_auth.sign_in()
			}
			return
		}

		set_is_saving(true)
		set_is_pending_save(false)
		set_error(undefined)

		const dataset_id = crypto.randomUUID()
		const tags = get_dataset_tags(tags_input)

		let drive_folder_id: string | undefined
		if (google_auth.is_authenticated) {
			try {
				drive_folder_id = await resolve_dataset_drive_folder_id({
					project_id,
					dataset_name: trimmed_name,
					google_access_token: google_auth.access_token
				})
			} catch (drive_error) {
				/* Drive folder creation failed — proceed without it */
				console.warn('Failed to create Drive folder:', drive_error)
			}
		}

		const { error: err } = await supabase.from('datasets').insert({
			id: dataset_id,
			project_id,
			name: trimmed_name,
			description: description.trim() || undefined,
			tags,
			status: 'Processing',
			image_count: 0,
			class_count: 0,
			storage_bytes: 0,
			drive_folder_id
		})

		set_is_saving(false)

		if (err) {
			set_error(err.message)
			return
		}

		set_name('')
		set_description('')
		set_tags_input('')
		on_created()
		on_close()
	}

	/* when Drive auth completes after a pending save, re-submit automatically */
	useEffect(() => {
		if (!is_pending_save) return
		if (google_auth.is_authenticated && !is_saving) {
			void handle_save()
		} else if (google_auth.error) {
			set_is_pending_save(false)
			set_error(google_auth.error)
		}
	}, [is_pending_save, google_auth.is_authenticated, google_auth.error, is_saving])

	if (!is_open) return <></>

	return (
		<div
			className={`fixed inset-0 ${bg_overlay} flex items-center justify-center z-50`}
			onClick={on_close}
		>
			<div
				className={`w-full max-w-md rounded-xl border ${bg_card} p-6 space-y-4`}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between">
					<h2 className={`text-lg font-semibold ${text_heading}`}>Create Dataset</h2>
					<button
						onClick={on_close}
						className={`p-1 rounded-md ${close_btn_hover} transition-colors ${text_muted}`}
					>
						<X size={18} />
					</button>
				</div>

				<div className="space-y-4">
					<div>
						<label className={`block text-sm font-medium mb-1 ${text_heading}`}>Name *</label>
						<input
							type="text"
							value={name}
							onChange={(e) => set_name(e.target.value)}
							placeholder="e.g. Urban_Vehicles_v5"
							className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${input_bg}`}
						/>
					</div>

					<div>
						<label className={`block text-sm font-medium mb-1 ${text_heading}`}>Description</label>
						<textarea
							value={description}
							onChange={(e) => set_description(e.target.value)}
							placeholder="Optional description..."
							rows={3}
							className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none ${input_bg}`}
						/>
					</div>

					<div>
						<label className={`block text-sm font-medium mb-1 ${text_heading}`}>Tags</label>
						<input
							type="text"
							value={tags_input}
							onChange={(e) => set_tags_input(e.target.value)}
							placeholder="bbox, segmentation, aerial (comma-separated)"
							className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${input_bg}`}
						/>
					</div>

					{error && <p className="text-sm text-red-500">{error}</p>}
				</div>

				<div className="flex justify-end gap-3 pt-2">
					<button
						onClick={on_close}
						className={`px-4 py-2 text-sm font-medium rounded-lg border ${is_dark_mode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'} transition-colors`}
					>
						Cancel
					</button>
					<button
						onClick={handle_save}
						disabled={is_saving}
						className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
					>
						{is_saving ? 'Creating...' : 'Create'}
					</button>
				</div>
			</div>
		</div>
	)
}
