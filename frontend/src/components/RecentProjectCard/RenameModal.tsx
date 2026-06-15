import { useState } from 'react'
import { Pencil, X } from 'lucide-react'

interface RenameModalProps {
	project_name: string
	is_dark_mode: boolean
	is_loading: boolean
	error: string | undefined
	on_confirm: (new_name: string) => void
	on_cancel: () => void
}

export function rename_modal({
	project_name,
	is_dark_mode,
	is_loading,
	error,
	on_confirm,
	on_cancel
}: RenameModalProps) {
	const [new_name, set_new_name] = useState(project_name)
	const is_valid = new_name.trim().length > 0

	const overlay_bg = is_dark_mode ? 'bg-black/60' : 'bg-black/40'
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-lg'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const input_classes = is_dark_mode
		? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500'
		: 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder:text-zinc-400'

	return (
		<div
			className={`fixed inset-0 z-[200] flex items-center justify-center ${overlay_bg}`}
			onClick={on_cancel}
		>
			<div
				className={`rounded-xl border ${card_classes} p-6 w-full max-w-md mx-4`}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-start justify-between mb-4">
					<div className="flex items-center gap-3">
						<div className={`p-2 rounded-full ${is_dark_mode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
							<Pencil size={20} className="text-blue-500" />
						</div>
						<div>
							<h3 className="font-semibold text-base">Rename Project</h3>
							<p className={`text-sm ${text_muted} mt-0.5`}>Enter a new name for this project.</p>
						</div>
					</div>
					<button
						onClick={on_cancel}
						className={`p-1 rounded-md ${is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
					>
						<X size={18} className={text_muted} />
					</button>
				</div>

				<div className="mb-4">
					<label className={`block text-sm font-medium mb-1.5 ${text_muted}`}>Project Name</label>
					<input
						type="text"
						value={new_name}
						onChange={(e) => {
							set_new_name(e.target.value)
						}}
						placeholder="Enter project name"
						className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${input_classes} ${error ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : ''}`}
						autoFocus
						onKeyDown={(e) => {
							if (e.key === 'Enter' && is_valid && !is_loading) {
								on_confirm(new_name.trim())
							}
						}}
					/>
					{error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
				</div>

				<div className="flex gap-3">
					<button
						onClick={on_cancel}
						className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
							is_dark_mode
								? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
								: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
						}`}
					>
						Cancel
					</button>
					<button
						onClick={() => on_confirm(new_name.trim())}
						disabled={!is_valid || is_loading}
						className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
							is_dark_mode
								? 'bg-blue-600 text-white hover:bg-blue-700'
								: 'bg-blue-600 text-white hover:bg-blue-700'
						}`}
					>
						{is_loading ? (
							<div className="flex items-center justify-center gap-2">
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								Renaming...
							</div>
						) : (
							'Rename'
						)}
					</button>
				</div>
			</div>
		</div>
	)
}
