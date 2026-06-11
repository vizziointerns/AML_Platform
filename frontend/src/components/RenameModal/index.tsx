import { useState, useEffect } from 'react'
import { X, Edit3 } from 'lucide-react'

export function rename_modal({
	is_open,
	current_name,
	existing_names,
	on_close,
	on_confirm,
	is_dark_mode,
	is_saving
}: {
	is_open: boolean
	current_name: string
	existing_names: string[]
	on_close: () => void
	on_confirm: (new_name: string) => Promise<void>
	is_dark_mode: boolean
	is_saving: boolean
}) {
	const [new_name, set_new_name] = useState(current_name)
	const [error, set_error] = useState('')

	useEffect(() => {
		if (is_open) {
			set_new_name(current_name)
			set_error('')
		}
	}, [is_open, current_name])

	if (!is_open) return undefined

	const trimmed = new_name.trim()

	function validate(): string | undefined {
		if (!trimmed) return 'Project name cannot be empty.'
		if (trimmed.length > 100) return 'Project name must be 100 characters or fewer.'
		if (/[<>:"/\\|?*]/.test(trimmed)) {
			return 'Project name cannot contain special characters like < > : " / \\ | ? *'
		}
		const is_duplicate = existing_names.some(
			(n) => n.toLowerCase() === trimmed.toLowerCase() && n !== current_name
		)
		if (is_duplicate) return 'A project with this name already exists.'
		return undefined
	}

	const validation_error = validate()
	const can_submit = !validation_error && !is_saving

	function handle_close() {
		set_new_name(current_name)
		set_error('')
		on_close()
	}

	async function handle_submit() {
		const err = validate()
		if (err) {
			set_error(err)
			return
		}
		set_error('')
		await on_confirm(trimmed)
	}

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'

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
							handle_submit()
						}
					}}
				>
					<div className={`px-6 py-4 border-b ${border_subtle} flex justify-between items-center`}>
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-full bg-blue-500/10">
								<Edit3 size={20} className="text-blue-500" />
							</div>
							<h2 className={`text-lg font-semibold tracking-tight ${text_heading}`}>
								Rename Project
							</h2>
						</div>
						<button
							onClick={handle_close}
							disabled={is_saving}
							className={`p-2 rounded-md transition-colors text-zinc-400 ${is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'}`}
						>
							<X size={18} />
						</button>
					</div>

					<div className="px-6 py-6 space-y-4">
						<div className={`text-sm ${text_muted}`}>Enter a new name for this project.</div>

						<div className="space-y-1.5">
							<label className={`text-sm font-medium ${text_heading}`}>Project Name</label>
							<input
								type="text"
								value={new_name}
								onChange={(e) => {
									set_new_name(e.target.value)
									if (error) set_error('')
								}}
								placeholder="Enter new project name"
								disabled={is_saving}
								autoFocus
								className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
                  ${border_subtle}
                  ${is_dark_mode ? 'bg-zinc-950 text-zinc-100 placeholder:text-zinc-500' : 'bg-white text-zinc-900 placeholder:text-zinc-400'}
                  focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50
                  ${error ? 'border-red-500' : ''}`}
							/>
							{error && <p className="text-xs text-red-500">{error}</p>}
						</div>
					</div>

					<div
						className={`px-6 py-4 border-t ${border_subtle} ${bg_subtle} rounded-b-xl flex justify-end gap-3`}
					>
						<button
							onClick={handle_close}
							disabled={is_saving}
							className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${text_heading} disabled:opacity-50 ${is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'}`}
						>
							Cancel
						</button>
						<button
							onClick={handle_submit}
							disabled={!can_submit}
							className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{is_saving ? (
								<>
									<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
									Renaming...
								</>
							) : (
								'Rename Project'
							)}
						</button>
					</div>
				</div>
			</div>
		</>
	)
}
