import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'

export function delete_modal({
	is_open,
	project_name,
	on_close,
	on_confirm,
	is_dark_mode,
	is_deleting
}: {
	is_open: boolean
	project_name: string
	on_close: () => void
	on_confirm: () => Promise<void>
	is_dark_mode: boolean
	is_deleting: boolean
}) {
	const [typed_name, set_typed_name] = useState('')

	if (!is_open) return undefined

	const trimmed = typed_name.trim()
	const is_name_matching = trimmed.toLowerCase() === project_name.toLowerCase()

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'

	function handle_close() {
		set_typed_name('')
		on_close()
	}

	async function handle_confirm() {
		if (!is_name_matching || is_deleting) return
		await on_confirm()
		set_typed_name('')
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
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault()
							handle_confirm()
						}
					}}
				>
					<div className={`px-6 py-4 border-b ${border_subtle} flex justify-between items-center`}>
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-full bg-red-500/10">
								<AlertTriangle size={20} className="text-red-500" />
							</div>
							<h2 className={`text-lg font-semibold tracking-tight ${text_heading}`}>
								Delete Project
							</h2>
						</div>
						<button
							onClick={handle_close}
							disabled={is_deleting}
							className={`p-2 rounded-md transition-colors text-zinc-400 ${is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'}`}
						>
							<X size={18} />
						</button>
					</div>

					<div className="px-6 py-6 space-y-4">
						<div className={`text-sm ${text_muted}`}>
							Deleting this project is permanent and cannot be undone.
						</div>

						<div className={`p-3 rounded-lg border ${border_subtle} ${bg_subtle}`}>
							<div className={`text-xs font-medium ${text_muted} mb-1`}>Project to delete:</div>
							<div className={`text-sm font-medium ${text_heading}`}>{project_name}</div>
						</div>

						<div className="space-y-1.5">
							<label className={`text-sm font-medium ${text_heading}`}>
								Type <span className="font-bold">&quot;{project_name}&quot;</span> to confirm
							</label>
							<input
								type="text"
								value={typed_name}
								onChange={(e) => set_typed_name(e.target.value)}
								placeholder={project_name}
								disabled={is_deleting}
								className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
                  ${border_subtle}
                  ${is_dark_mode ? 'bg-zinc-950 text-zinc-100 placeholder:text-zinc-500' : 'bg-white text-zinc-900 placeholder:text-zinc-400'}
                  focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50`}
							/>
						</div>
					</div>

					<div
						className={`px-6 py-4 border-t ${border_subtle} ${bg_subtle} rounded-b-xl flex justify-end gap-3`}
					>
						<button
							onClick={handle_close}
							disabled={is_deleting}
							className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${text_heading} disabled:opacity-50 ${is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'}`}
						>
							Cancel
						</button>
						<button
							onClick={handle_confirm}
							disabled={!is_name_matching || is_deleting}
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
