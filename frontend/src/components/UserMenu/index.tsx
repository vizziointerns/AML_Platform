import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, Shield, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../../utils/supabase'
import { use_auth } from '../../contexts/auth_context'
import { use_app_context } from '../../contexts/app_context'

type UserInfo = {
	username: string
	email: string
	role: string
	avatar_url?: string
}

type FetchStatus = 'idle' | 'loading' | 'loaded' | 'error'

export default function user_menu() {
	const { sign_out } = use_auth()
	const { is_dark_mode } = use_app_context()
	const navigate = useNavigate()

	const [is_open, set_is_open] = useState(false)
	const [status, set_status] = useState<FetchStatus>('idle')
	const [user_info, set_user_info] = useState<UserInfo | undefined>()
	const [fetch_error, set_fetch_error] = useState<string | undefined>()
	const [menu_el, set_menu_el] = useState<HTMLDivElement | undefined>()
	const has_fetched = useRef(false)

	const menu_ref = useCallback((el: HTMLDivElement | null) => {
		set_menu_el(el ?? undefined)
	}, [])

	useEffect(() => {
		function handle_click_outside(e: MouseEvent) {
			if (menu_el && !menu_el.contains(e.target as Node)) {
				set_is_open(false)
			}
		}
		document.addEventListener('mousedown', handle_click_outside)
		return () => document.removeEventListener('mousedown', handle_click_outside)
	}, [menu_el])

	async function fetch_user_info() {
		set_status('loading')
		const { data, error } = await supabase.auth.getUser()

		if (error) {
			set_status('error')
			set_fetch_error('Unable to load user info')
			return
		}

		if (!data?.user) {
			set_status('error')
			set_fetch_error('Not signed in')
			return
		}

		const u = data.user
		const meta = u.user_metadata ?? {}
		const username = meta.full_name ?? meta.name ?? u.email?.split('@')[0] ?? 'User'
		const role = u.app_metadata?.role ?? meta.role ?? 'Member'

		set_user_info({
			username,
			email: u.email ?? '',
			role,
			avatar_url: meta.avatar_url
		})
		has_fetched.current = true
		set_status('loaded')
	}

	function handle_icon_click() {
		const is_next_open = !is_open
		set_is_open(is_next_open)

		if (is_next_open && !has_fetched.current) {
			fetch_user_info()
		}
	}

	async function handle_sign_out() {
		await sign_out()
		set_is_open(false)
		has_fetched.current = false
		set_user_info(undefined)
		set_status('idle')
	}

	function handle_retry() {
		has_fetched.current = false
		set_status('idle')
		set_fetch_error(undefined)
		set_is_open(false)
	}

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'

	function get_initials() {
		if (!user_info?.username) return '?'
		return user_info.username
			.split(' ')
			.map((s: string) => s[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	}

	function render_dropdown_content() {
		if (status === 'loading') {
			return (
				<div className="flex items-center gap-3 px-4 py-5">
					<Loader2 size={18} className="text-blue-500 animate-spin shrink-0" />
					<span className={`text-sm ${text_muted}`}>Loading user info...</span>
				</div>
			)
		}

		if (status === 'error') {
			return (
				<div className="px-4 py-5 space-y-3">
					<div className="flex items-start gap-3">
						<AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
						<div>
							<p className={`text-sm font-medium ${text_heading}`}>{fetch_error}</p>
							{fetch_error === 'Not signed in' && (
								<button
									onClick={() => {
										set_is_open(false)
										navigate('/login')
									}}
									className="mt-2 text-sm text-blue-500 hover:text-blue-400 underline"
								>
									Sign in
								</button>
							)}
							{fetch_error === 'Unable to load user info' && (
								<button
									onClick={handle_retry}
									className="mt-2 text-sm text-blue-500 hover:text-blue-400 underline"
								>
									Try again
								</button>
							)}
						</div>
					</div>
				</div>
			)
		}

		if (status === 'loaded' && user_info) {
			const initials = get_initials()
			return (
				<>
					<div className="px-4 py-4 space-y-3">
						<div className="flex items-center gap-3">
							{user_info.avatar_url ? (
								<img
									src={user_info.avatar_url}
									alt=""
									className="h-10 w-10 rounded-full object-cover"
								/>
							) : (
								<div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
									{initials}
								</div>
							)}
							<div className="min-w-0">
								<p className={`text-sm font-semibold truncate ${text_heading}`}>
									{user_info.username}
								</p>
								<p className={`text-xs truncate ${text_muted}`}>{user_info.email}</p>
							</div>
						</div>

						<div className={`flex items-center gap-2 text-xs ${text_muted}`}>
							<Shield size={14} />
							<span>{user_info.role}</span>
						</div>
					</div>

					<div className={`border-t ${border_subtle}`}>
						<button
							onClick={handle_sign_out}
							className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
								is_dark_mode
									? 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800/50'
									: 'text-zinc-600 hover:text-red-600 hover:bg-zinc-100'
							}`}
							role="menuitem"
						>
							<LogOut size={16} />
							Sign Out
						</button>
					</div>
				</>
			)
		}

		return
	}

	const initials = get_initials()

	return (
		<div ref={menu_ref} className="relative">
			<button
				onClick={handle_icon_click}
				title="User settings"
				aria-label="User settings"
				aria-haspopup="true"
				aria-expanded={is_open}
				className="flex items-center gap-2 hover:opacity-80 transition-opacity"
			>
				{user_info?.avatar_url ? (
					<img
						src={user_info.avatar_url}
						alt=""
						className="h-8 w-8 rounded-full object-cover border-2 border-zinc-950 shadow-sm"
					/>
				) : (
					<div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white border-2 border-zinc-950 shadow-sm">
						{status === 'loaded' ? (
							<span className="text-xs font-semibold">{initials}</span>
						) : (
							<User size={14} />
						)}
					</div>
				)}
			</button>

			{is_open && (
				<div
					className={`absolute right-0 mt-2 w-64 rounded-xl border shadow-xl overflow-hidden z-50 ${
						is_dark_mode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
					}`}
					role="menu"
					aria-label="User menu"
				>
					{render_dropdown_content()}
				</div>
			)}
		</div>
	)
}
