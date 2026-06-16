import { useState, useEffect } from 'react'
import { X, TriangleAlert } from 'lucide-react'
import { supabase } from '../../utils/supabase'
import { use_project_store } from '../../store/projectStore'
import type { Project } from '../../store/projectStore'

export default function delete_project_dialog({
	isOpen,
	project,
	on_close,
	is_dark_mode,
	on_deleted
}: {
	isOpen: boolean
	project: Project | undefined
	on_close: () => void
	is_dark_mode: boolean
	on_deleted: (name: string) => void
}) {
	const delete_project = use_project_store((s) => s.deleteProject)
	const [confirm_name, set_confirm_name] = useState('')
	const [input_error, set_input_error] = useState('')
	const [is_deleting, set_is_deleting] = useState(false)

	useEffect(() => {
		if (isOpen) {
			set_confirm_name('')
			set_input_error('')
			set_is_deleting(false)
		}
	}, [isOpen])

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'

	if (!isOpen || !project) return undefined
	const p = project

	async function handle_delete() {
		const trimmed = confirm_name.trim()
		if (!trimmed) {
			set_input_error('Please type the project name to confirm.')
			return
		}
		if (trimmed !== p.name) {
			set_input_error('Project name does not match. Please try again.')
			return
		}

		set_is_deleting(true)
		set_input_error('')

		const { error: db_err } = await supabase.from('projects').delete().eq('id', p.id)

		if (db_err) {
			set_input_error(db_err.message)
			set_is_deleting(false)
			return
		}

		delete_project(p.id)
		on_deleted(p.name)
		on_close()
	}

	return (
		<>
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
				onClick={!is_deleting ? on_close : undefined}
			/>
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
				<div
					className={`pointer-events-auto w-full max-w-md rounded-xl shadow-2xl border ${border_subtle} ${bg_card} animate-in zoom-in-95 duration-300`}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault()
							handle_delete()
						}
						if (e.key === 'Escape') {
							on_close()
						}
					}}
				>
					<div className={`px-6 py-4 border-b ${border_subtle} flex justify-between items-center`}>
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
								<TriangleAlert size={20} className="text-red-500" />
							</div>
							<div>
								<h2 className={`text-lg font-semibold tracking-tight ${text_heading}`}>
									Delete Project
								</h2>
								<p className={`text-sm ${text_muted}`}>This action cannot be undone.</p>
							</div>
						</div>
						<button
							className={`p-2 rounded-md ${hover_bg} transition-colors text-zinc-400`}
							onClick={on_close}
							disabled={is_deleting}
						>
							<X size={18} />
						</button>
					</div>

					<div className="px-6 py-5 space-y-4">
						<p className={`text-sm ${text_muted}`}>
							This will permanently delete{' '}
							<span className={`font-semibold ${text_heading}`}>{p.name}</span> and all its
							data. Type the project name below to confirm.
						</p>

						<div className="space-y-1.5">
							<label className={`text-sm font-medium ${text_heading}`}>
								Project Name <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={confirm_name}
								onChange={(e) => {
									set_confirm_name(e.target.value)
									if (input_error) set_input_error('')
								}}
								placeholder={p.name}
								disabled={is_deleting}
								className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
									${border_subtle}
									${is_dark_mode ? 'bg-zinc-950 text-zinc-100 placeholder:text-zinc-500' : 'bg-white text-zinc-900 placeholder:text-zinc-400'}
									focus:border-red-500 focus:ring-1 focus:ring-red-500/50
									${input_error ? 'border-red-500' : ''}`}
							/>
							{input_error && <p className="text-xs text-red-500">{input_error}</p>}
						</div>
					</div>

					<div
						className={`px-6 py-4 border-t ${border_subtle} ${bg_subtle} rounded-b-xl flex justify-end gap-3`}
					>
						<button
							onClick={on_close}
							disabled={is_deleting}
							className={`px-4 py-2.5 text-sm font-medium rounded-lg ${hover_bg} transition-colors ${text_heading} disabled:opacity-50`}
						>
							Cancel
						</button>
						<button
							onClick={handle_delete}
							disabled={is_deleting}
							className="px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{is_deleting ? (
								<>
									<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
									Deleting...
								</>
							) : (
								'Delete Project'
							)}
						</button>
					</div>
				</div>
			</div>
		</>
	)
}
