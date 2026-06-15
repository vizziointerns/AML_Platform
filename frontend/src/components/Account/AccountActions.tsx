import { LogOut, Edit3 } from 'lucide-react'

export function account_actions({
	is_dark_mode,
	on_sign_out
}: {
	is_dark_mode: boolean
	on_sign_out: () => void
}) {
	const card_cls = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'
	const btn_hover = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'

	return (
		<div className={`rounded-xl border p-6 ${card_cls}`} role="region" aria-label="Account actions">
			<h3 className="text-base font-semibold tracking-tight mb-5">Account Actions</h3>

			<div className="space-y-3">
				<button
					onClick={() => {}}
					className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${btn_hover} ${
						is_dark_mode ? 'text-zinc-300' : 'text-zinc-700'
					}`}
					aria-label="Edit profile (coming soon)"
					tabIndex={0}
				>
					<Edit3 size={18} className="text-zinc-500" />
					<span>Edit Profile</span>
					<span className={`ml-auto text-xs ${is_dark_mode ? 'text-zinc-600' : 'text-zinc-400'}`}>
						Coming soon
					</span>
				</button>

				<button
					onClick={on_sign_out}
					className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
						is_dark_mode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
					}`}
					aria-label="Sign out of your account"
					tabIndex={0}
				>
					<LogOut size={18} />
					<span>Sign Out</span>
				</button>
			</div>
		</div>
	)
}
