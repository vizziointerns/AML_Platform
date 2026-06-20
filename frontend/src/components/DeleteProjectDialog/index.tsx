import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { supabase } from '../../utils/supabase'
import { use_auth } from '../../contexts/auth_context'
import { use_project_store, type Project } from '../../store/projectStore'

interface DeleteProjectDialogProps {
	delete_target: Project | undefined
	on_close: () => void
	on_success?: (name: string) => void
	is_dark_mode: boolean
}

export default function delete_project_dialog({
	delete_target,
	on_close,
	on_success,
	is_dark_mode
}: DeleteProjectDialogProps) {
	const { user } = use_auth()
	const delete_project = use_project_store((s) => s.deleteProject)
	const [confirm_name, set_confirm_name] = useState('')
	const [confirm_error, set_confirm_error] = useState('')
	const [is_deleting, set_is_deleting] = useState(false)

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-100'

	useEffect(() => {
		if (!delete_target) {
			set_confirm_name('')
			set_confirm_error('')
			set_is_deleting(false)
		}
	}, [delete_target])

	if (!delete_target) return undefined

	const target = delete_target

	async function handle_delete(e?: React.FormEvent) {
		e?.preventDefault()
		if (!user) return

		const trimmed = confirm_name.trim()
		if (trimmed !== target.name) {
			set_confirm_error('Project name does not match')
			return
		}

		set_is_deleting(true)
		set_confirm_error('')

		const { error: err } = await supabase
			.from('projects')
			.delete()
			.eq('id', target.id)
			.eq('user_id', user.id)

		if (err) {
			set_is_deleting(false)
			set_confirm_error(err.message)
			return
		}

		delete_project(target.id)
		on_success?.(target.name)
		on_close()
	}

	function handle_close() {
		set_confirm_name('')
		set_confirm_error('')
		set_is_deleting(false)
		on_close()
	}

	return (
		<>
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
				onClick={handle_close}
			/>
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
				<div
					className={`pointer-events-auto w-full max-w-md rounded-xl shadow-2xl border ${border_subtle} ${bg_card} animate-in zoom-in-95 duration-300`}
					role="dialog"
					aria-labelledby="delete-dialog-title"
					aria-describedby="delete-dialog-description"
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => {
						if (e.key === 'Escape') handle_close()
					}}
				>
					<form onSubmit={handle_delete}>
						<div className={`px-6 py-4 border-b ${border_subtle} flex items-center gap-3`}>
							<div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
								<AlertTriangle size={20} className="text-red-500" />
							</div>
							<div>
								<h2
									id="delete-dialog-title"
									className={`text-lg font-semibold tracking-tight ${text_heading}`}
								>
									Delete Project
								</h2>
								<p id="delete-dialog-description" className={`text-sm ${text_muted}`}>
									This action cannot be undone.
								</p>
							</div>
							<button
								type="button"
								className={`ml-auto p-2 rounded-md ${is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'} transition-colors text-zinc-400`}
								onClick={handle_close}
							>
								<X size={18} />
							</button>
						</div>

						<div className="px-6 py-6 space-y-4">
							<p className={`text-sm ${text_muted}`}>
								Please type <span className="font-semibold text-red-500">{target.name}</span> to
								confirm deletion.
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
										if (confirm_error) set_confirm_error('')
									}}
									placeholder={`Type "${target.name}" to confirm`}
									className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
										${border_subtle}
										${is_dark_mode ? 'bg-zinc-950 text-zinc-100 placeholder:text-zinc-500' : 'bg-white text-zinc-900 placeholder:text-zinc-400'}
										focus:border-red-500 focus:ring-1 focus:ring-red-500/50
										${confirm_error ? 'border-red-500' : ''}`}
								/>
								{confirm_error && (
									<p className="text-xs text-red-500 flex items-center gap-1.5">
										<AlertTriangle size={11} />
										{confirm_error}
									</p>
								)}
							</div>
						</div>

						<div
							className={`px-6 py-4 border-t ${border_subtle} ${bg_subtle} rounded-b-xl flex justify-end gap-3`}
						>
							<button
								type="button"
								onClick={handle_close}
								disabled={is_deleting}
								className={`px-4 py-2.5 text-sm font-medium rounded-lg ${is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'} transition-colors ${text_heading} disabled:opacity-50`}
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={is_deleting || !confirm_name.trim() || !user}
								className="px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{is_deleting ? (
									<>
										<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
										Deleting...
									</>
								) : (
									<>
										<AlertTriangle size={15} />
										Delete Project
									</>
								)}
							</button>
						</div>
					</form>
				</div>
			</div>
		</>
	)
}
