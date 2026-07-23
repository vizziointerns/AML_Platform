import type { Project } from '../../store/projectStore'

export function rename_dialog({
	target,
	name,
	on_name_change,
	on_save,
	on_close,
	is_dark_mode
}: {
	target: Project | undefined
	name: string
	on_name_change: (v: string) => void
	on_save: () => void
	on_close: () => void
	is_dark_mode: boolean
}) {
	if (!target) return undefined
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'

	return (
		<>
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
				onClick={on_close}
			/>
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
				<div
					className={`pointer-events-auto w-full max-w-sm rounded-xl shadow-2xl border ${border_subtle} ${bg_card} animate-in zoom-in-95 duration-300`}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault()
							on_save()
						}
					}}
				>
					<div className={`px-5 py-4 border-b ${border_subtle}`}>
						<h3 className={`font-semibold ${text_heading}`}>Rename Project</h3>
					</div>
					<div className="px-5 py-4 space-y-3">
						<label className={`text-sm font-medium ${text_heading}`}>Project Name</label>
						<input
							type="text"
							value={name}
							onChange={(e) => on_name_change(e.target.value)}
							autoFocus
							className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${border_subtle} ${is_dark_mode ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'} focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50`}
						/>
					</div>
					<div
						className={`px-5 py-4 border-t ${border_subtle} ${bg_subtle} rounded-b-xl flex justify-end gap-3`}
					>
						<button
							onClick={on_close}
							className={`px-4 py-2 text-sm font-medium rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors ${text_heading}`}
						>
							Cancel
						</button>
						<button
							onClick={on_save}
							disabled={!name.trim()}
							className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Save
						</button>
					</div>
				</div>
			</div>
		</>
	)
}
