import { User } from 'lucide-react'

interface UserInfo {
	username: string
	email: string
	role: string
	avatar_url: string | undefined
}

export function user_info_card({ info, is_dark_mode }: { info: UserInfo; is_dark_mode: boolean }) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const card_cls = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'
	const label_cls = is_dark_mode ? 'text-zinc-500' : 'text-zinc-400'
	const value_cls = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'

	return (
		<div
			className={`rounded-xl border p-6 ${card_cls}`}
			role="region"
			aria-label="User profile information"
		>
			<h3 className="text-base font-semibold tracking-tight mb-5">Profile Info</h3>

			<div className="flex items-center gap-4 mb-6">
				<div
					className="h-16 w-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0"
					aria-hidden="true"
				>
					{info.avatar_url ? (
						<img src={info.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
					) : (
						<User size={28} />
					)}
				</div>
				<div className="min-w-0">
					<p className={`text-lg font-semibold truncate ${value_cls}`}>{info.username}</p>
					<p className={`text-sm truncate ${text_muted}`}>{info.email}</p>
				</div>
			</div>

			<dl className="space-y-4">
				<div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
					<dt className={`text-sm ${label_cls}`}>Username</dt>
					<dd className={`text-sm font-medium ${value_cls}`}>{info.username}</dd>
				</div>
				<div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
					<dt className={`text-sm ${label_cls}`}>Email</dt>
					<dd className={`text-sm font-medium ${value_cls}`}>{info.email}</dd>
				</div>
				<div className="flex justify-between items-center py-2">
					<dt className={`text-sm ${label_cls}`}>Role</dt>
					<dd>
						<span
							className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
								is_dark_mode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'
							}`}
						>
							{info.role}
						</span>
					</dd>
				</div>
			</dl>
		</div>
	)
}
