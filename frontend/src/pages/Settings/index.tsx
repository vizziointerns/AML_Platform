import { useState, createElement } from 'react'
import type { ReactNode } from 'react'
import type { User as SupabaseUser, AuthError } from '@supabase/supabase-js'
import { use_auth } from '../../contexts/auth_context'
import { use_app_context } from '../../contexts/app_context'
import { Sun, Moon, LogOut, User, Shield, Palette, KeyRound, Pencil, X, Check } from 'lucide-react'

interface SettingsTab {
	id: string
	label: string
	icon: ReactNode
}

const TABS: SettingsTab[] = [
	{ id: 'profile', label: 'Profile', icon: <User size={16} /> },
	{ id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
	{ id: 'account', label: 'Account', icon: <KeyRound size={16} /> }
]

function sidebar_nav({
	tabs,
	active_id,
	is_dark_mode,
	on_select
}: {
	tabs: SettingsTab[]
	active_id: string
	is_dark_mode: boolean
	on_select: (id: string) => void
}) {
	const border_color = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'

	return (
		<nav
			className={`w-full lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r ${border_color} lg:pr-4 pb-4 lg:pb-0`}
		>
			<div className="flex lg:flex-col gap-1 overflow-x-auto">
				{tabs.map((tab) => {
					const is_active = tab.id === active_id
					const base =
						'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0'
					const active_classes = is_dark_mode
						? 'bg-zinc-800 text-zinc-100'
						: 'bg-zinc-100 text-zinc-900'
					const inactive_classes = is_dark_mode
						? 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
						: 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'

					return (
						<button
							key={tab.id}
							onClick={() => on_select(tab.id)}
							className={`${base} ${is_active ? active_classes : inactive_classes}`}
						>
							{tab.icon}
							{tab.label}
						</button>
					)
				})}
			</div>
		</nav>
	)
}

function section_title({
	icon,
	title,
	description,
	desc_classes
}: {
	icon: ReactNode
	title: string
	description: string
	desc_classes: string
}) {
	return (
		<div className="flex items-center gap-3 mb-6">
			<div className="p-2 rounded-lg bg-zinc-600/10 text-zinc-500">{icon}</div>
			<div>
				<h2 className="text-lg font-semibold tracking-tight">{title}</h2>
				<p className={desc_classes}>{description}</p>
			</div>
		</div>
	)
}

function profile_view({
	user,
	initials,
	user_name,
	is_dark_mode,
	text_muted,
	on_edit
}: {
	user: SupabaseUser | undefined
	initials: string
	user_name: string | undefined
	is_dark_mode: boolean
	text_muted: string
	on_edit: () => void
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex items-center gap-4">
				<div className="h-16 w-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
					<span className="text-xl font-bold">{initials}</span>
				</div>
				<div className="min-w-0">
					<p
						className={`text-base font-medium truncate ${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'}`}
					>
						{user_name ?? user?.email?.split('@')[0] ?? 'User'}
					</p>
					<p className={`text-sm ${text_muted} truncate`}>{user?.email ?? ''}</p>
					<div className="flex items-center gap-1 mt-1.5">
						<Shield size={12} className="text-emerald-500" />
						<span className="text-[11px] text-emerald-500 font-medium uppercase tracking-wider">
							Verified Member
						</span>
					</div>
				</div>
			</div>
			<button
				onClick={on_edit}
				className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
					is_dark_mode
						? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
						: 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
				}`}
			>
				<Pencil size={14} />
				Edit
			</button>
		</div>
	)
}

function profile_edit({
	user,
	user_name,
	is_dark_mode,
	desc_classes,
	update_user,
	on_cancel,
	on_saved
}: {
	user: SupabaseUser | undefined
	user_name: string | undefined
	is_dark_mode: boolean
	desc_classes: string
	update_user: (attrs: {
		email?: string
		password?: string
		data?: Record<string, unknown>
	}) => Promise<{ error: AuthError | null }>
	on_cancel: () => void
	on_saved: () => void
}) {
	const [name, set_name] = useState(user_name ?? '')
	const [is_saving, set_is_saving] = useState(false)
	const [error, set_error] = useState<string | undefined>()

	const input_classes = `w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${
		is_dark_mode
			? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-blue-500'
			: 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-blue-500'
	}`

	async function handle_save() {
		set_is_saving(true)
		set_error(undefined)
		const { error: err } = await update_user({ data: { full_name: name } })
		set_is_saving(false)
		if (err) {
			set_error(err.message)
		} else {
			on_saved()
		}
	}

	return (
		<div className="space-y-4">
			<div>
				<label
					className={`block text-sm font-medium mb-1.5 ${is_dark_mode ? 'text-zinc-300' : 'text-zinc-700'}`}
				>
					Name
				</label>
				<input
					type="text"
					value={name}
					onChange={(e) => set_name(e.target.value)}
					placeholder="Your full name"
					className={input_classes}
				/>
			</div>
			<div>
				<label
					className={`block text-sm font-medium mb-1.5 ${is_dark_mode ? 'text-zinc-300' : 'text-zinc-700'}`}
				>
					Email
				</label>
				<input
					type="email"
					value={user?.email ?? ''}
					disabled
					className={`w-full px-3 py-2 rounded-lg border text-sm outline-none cursor-not-allowed ${
						is_dark_mode
							? 'bg-zinc-900 border-zinc-800 text-zinc-500'
							: 'bg-zinc-50 border-zinc-200 text-zinc-400'
					}`}
				/>
				<p className={desc_classes}>Email cannot be changed</p>
			</div>

			{error && <p className="text-sm text-red-500">{error}</p>}

			<div className="flex items-center gap-2 pt-2">
				<button
					onClick={handle_save}
					disabled={is_saving}
					className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
				>
					<Check size={14} />
					{is_saving ? 'Saving...' : 'Save'}
				</button>
				<button
					onClick={on_cancel}
					disabled={is_saving}
					className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
						is_dark_mode
							? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
							: 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
					}`}
				>
					<X size={14} />
					Cancel
				</button>
			</div>
		</div>
	)
}

function appearance_content({
	is_dark_mode,
	toggle_theme,
	label_classes,
	desc_classes
}: {
	is_dark_mode: boolean
	toggle_theme: () => void
	label_classes: string
	desc_classes: string
}) {
	return (
		<div>
			{section_title({
				icon: is_dark_mode ? (
					<Sun size={20} className="text-amber-500" />
				) : (
					<Moon size={20} className="text-amber-500" />
				),
				title: 'Appearance',
				description: 'Customize your viewing experience',
				desc_classes
			})}
			<div
				className={`flex items-center justify-between p-4 rounded-xl border ${is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'}`}
			>
				<div>
					<p className={label_classes}>Dark Mode</p>
					<p className={desc_classes}>Toggle between dark and light themes</p>
				</div>
				<button
					onClick={toggle_theme}
					className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
						is_dark_mode ? 'bg-blue-600' : 'bg-zinc-300'
					}`}
				>
					<span
						className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
							is_dark_mode ? 'translate-x-6' : 'translate-x-1'
						}`}
					>
						{is_dark_mode ? (
							<Moon size={10} className="text-blue-600" />
						) : (
							<Sun size={10} className="text-amber-500" />
						)}
					</span>
				</button>
			</div>
		</div>
	)
}

function account_content({
	sign_out,
	label_classes,
	desc_classes,
	is_dark_mode
}: {
	sign_out: () => Promise<void>
	label_classes: string
	desc_classes: string
	is_dark_mode: boolean
}) {
	return (
		<div>
			{section_title({
				icon: <KeyRound size={20} className="text-red-500" />,
				title: 'Account',
				description: 'Manage your account and sign out',
				desc_classes
			})}
			<div
				className={`rounded-xl border p-5 ${is_dark_mode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'}`}
			>
				<div className="mb-4">
					<p className={label_classes}>Sign Out</p>
					<p className={desc_classes}>
						Sign out of your account on this device. You can sign back in anytime.
					</p>
				</div>
				<button
					onClick={async () => {
						try {
							await sign_out()
						} catch (error) {
							console.error('Sign out failed:', error)
						}
					}}
					className="flex items-center gap-2 px-4 py-2 bg-red-600/10 text-red-500 text-sm font-medium rounded-lg hover:bg-red-600/20 transition-colors"
				>
					<LogOut size={16} />
					Sign Out
				</button>
			</div>
		</div>
	)
}

export default function settings_page() {
	const [active_tab, set_active_tab] = useState('profile')
	const [is_editing_profile, set_is_editing_profile] = useState(false)
	const { user, sign_out, update_user } = use_auth()
	const { is_dark_mode, toggle_theme } = use_app_context()

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const label_classes = `text-sm font-medium ${is_dark_mode ? 'text-zinc-300' : 'text-zinc-700'}`
	const desc_classes = `text-xs ${text_muted} mt-0.5`

	const user_name = user?.user_metadata?.full_name as string | undefined
	const initials = user_name
		? user_name
				.split(' ')
				.map((s) => s[0])
				.join('')
				.toUpperCase()
				.slice(0, 2)
		: (user?.email?.[0]?.toUpperCase() ?? '?')

	return (
		<main className="flex flex-col flex-1 min-w-0">
			<div className="page-layout">
				<div className="page-content">
					<div className="page-header mb-6 lg:mb-8">
						<div>
							<h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
							<p className={`text-sm mt-1 ${text_muted}`}>
								Manage your account preferences and configuration.
							</p>
						</div>
					</div>

					<div className="flex flex-col lg:flex-row gap-6">
						{sidebar_nav({
							tabs: TABS,
							active_id: active_tab,
							is_dark_mode,
							on_select: (id) => {
								set_active_tab(id)
								set_is_editing_profile(false)
							}
						})}

						<div className="flex-1 min-w-0 max-w-2xl">
							{active_tab === 'profile' && (
								<div>
									{section_title({
										icon: <User size={20} className="text-blue-500" />,
										title: 'Profile',
										description: 'Your account information',
										desc_classes
									})}
									{is_editing_profile
										? createElement(profile_edit, {
												user,
												user_name,
												is_dark_mode,
												desc_classes,
												update_user,
												on_cancel: () => set_is_editing_profile(false),
												on_saved: () => set_is_editing_profile(false)
											})
										: profile_view({
												user,
												initials,
												user_name,
												is_dark_mode,
												text_muted,
												on_edit: () => set_is_editing_profile(true)
											})}
								</div>
							)}
							{active_tab === 'appearance' &&
								appearance_content({
									is_dark_mode,
									toggle_theme,
									label_classes,
									desc_classes
								})}
							{active_tab === 'account' &&
								account_content({
									sign_out,
									label_classes,
									desc_classes,
									is_dark_mode
								})}
						</div>
					</div>
				</div>
			</div>
		</main>
	)
}
