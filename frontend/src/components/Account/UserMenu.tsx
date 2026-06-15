import { User, LogOut, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { use_auth } from '../../contexts/auth_context'

const DM_STYLES = {
	bg: ['bg-zinc-900 border-zinc-800', 'bg-white border-zinc-200'],
	border: ['border-zinc-800', 'border-zinc-100'],
	heading: ['text-zinc-100', 'text-zinc-900'],
	muted: ['text-zinc-400', 'text-zinc-500'],
	label: ['text-zinc-500', 'text-zinc-400'],
	badge: ['bg-blue-500/10 text-blue-400', 'bg-blue-50 text-blue-700'],
	btn_normal: [
		'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50',
		'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
	],
	btn_danger: [
		'text-zinc-400 hover:text-red-400 hover:bg-red-500/10',
		'text-zinc-600 hover:text-red-600 hover:bg-red-50'
	]
} as const

function s(idx: number, key: keyof typeof DM_STYLES): string {
	return DM_STYLES[key][idx]!
}

function pick_user_name(
	meta: Record<string, unknown> | undefined,
	email: string | undefined
): string {
	const name = meta?.username as string | undefined
	if (name) {
		return name
	}
	const full = meta?.full_name as string | undefined
	if (full) {
		return full
	}
	const local = email?.split('@')[0]
	if (local) {
		return local
	}
	return 'User'
}

export function user_menu({
	is_dark_mode,
	is_open,
	on_close,
	on_sign_out
}: {
	is_dark_mode: boolean
	is_open: boolean
	on_close: () => void
	on_sign_out: () => void
}) {
	const { user } = use_auth()
	const navigate = useNavigate()

	if (!is_open) {
		return undefined
	}

	const idx = is_dark_mode ? 0 : 1
	const meta = user?.user_metadata as Record<string, unknown> | undefined
	const role = (meta?.role as string) || 'Member'
	const avatar_url = meta?.avatar_url as string | undefined
	const email = user?.email || ''
	const username = pick_user_name(meta, user?.email)

	return (
		<div
			className={`absolute right-0 mt-2 w-64 rounded-xl border shadow-xl overflow-hidden z-50 ${s(idx, 'bg')}`}
			role="menu"
			aria-label="User menu"
		>
			<div className={`px-4 py-3 border-b ${s(idx, 'border')}`}>
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0">
						{avatar_url ? (
							<img src={avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
						) : (
							<User size={16} />
						)}
					</div>
					<div className="min-w-0 flex-1">
						<p className={`text-sm font-semibold truncate ${s(idx, 'heading')}`}>{username}</p>
						<p className={`text-xs truncate ${s(idx, 'muted')}`}>{email}</p>
					</div>
				</div>
			</div>

			<div className={`px-4 py-2 border-b ${s(idx, 'border')}`}>
				<dl className="space-y-1.5">
					<div className="flex justify-between items-center">
						<dt className={`text-xs ${s(idx, 'label')}`}>Role</dt>
						<dd>
							<span
								className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${s(idx, 'badge')}`}
							>
								{role}
							</span>
						</dd>
					</div>
				</dl>
			</div>

			<div className="py-1">
				<button
					onClick={() => {
						on_close()
						navigate('/account')
					}}
					className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors ${s(idx, 'btn_normal')}`}
					role="menuitem"
				>
					<Settings size={16} />
					Account Settings
				</button>
				<button
					onClick={() => {
						on_sign_out()
						on_close()
					}}
					className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors ${s(idx, 'btn_danger')}`}
					role="menuitem"
				>
					<LogOut size={16} />
					Sign Out
				</button>
			</div>
		</div>
	)
}
