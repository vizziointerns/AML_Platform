import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface DeleteModalProps {
	project_name: string
	is_dark_mode: boolean
	is_loading: boolean
	on_confirm: () => void
	on_cancel: () => void
}

export function delete_modal({
	project_name,
	is_dark_mode,
	is_loading,
	on_confirm,
	on_cancel
}: DeleteModalProps) {
	const [typed_name, set_typed_name] = useState('')

	const is_match = typed_name.toLowerCase() === project_name.toLowerCase()

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
						<div className={`p-2 rounded-full ${is_dark_mode ? 'bg-red-500/10' : 'bg-red-50'}`}>
							<AlertTriangle size={20} className="text-red-500" />
						</div>
						<div>
							<h3 className="font-semibold text-base">Delete Project</h3>
							<p className={`text-sm ${text_muted} mt-0.5`}>This action cannot be undone.</p>
						</div>
					</div>
					<button
						onClick={on_cancel}
						className={`p-1 rounded-md ${is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
					>
						<X size={18} className={text_muted} />
					</button>
				</div>

				<div
					className={`p-3 rounded-lg text-sm mb-4 ${is_dark_mode ? 'bg-red-500/5 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}
				>
					<p className={is_dark_mode ? 'text-red-400' : 'text-red-700'}>
						Deleting this project is permanent and cannot be undone.
					</p>
				</div>

				<div className="mb-4">
					<label className={`block text-sm font-medium mb-1.5 ${text_muted}`}>
						Type <span className="font-semibold text-zinc-300">{project_name}</span> to confirm:
					</label>
					<input
						type="text"
						value={typed_name}
						onChange={(e) => set_typed_name(e.target.value)}
						placeholder={project_name}
						className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all ${input_classes}`}
						autoFocus
					/>
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
						onClick={on_confirm}
						disabled={!is_match || is_loading}
						className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
							is_dark_mode
								? 'bg-red-600 text-white hover:bg-red-700'
								: 'bg-red-600 text-white hover:bg-red-700'
						}`}
					>
						{is_loading ? (
							<div className="flex items-center justify-center gap-2">
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								Deleting...
							</div>
						) : (
							'Delete'
						)}
					</button>
				</div>
			</div>
		</div>
	)
}
