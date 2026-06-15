import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../utils/supabase'
import { use_auth } from '../../contexts/auth_context'
import { use_app_context } from '../../contexts/app_context'
import { user_info_card as UserInfoCard } from '../../components/Account/UserInfoCard'
import { account_actions as AccountActions } from '../../components/Account/AccountActions'

interface UserInfo {
	username: string
	email: string
	role: string
	avatar_url: string | undefined
}

let cached_info: UserInfo | undefined = undefined

function get_default_info(
	email: string,
	user_metadata: Record<string, unknown> | undefined
): UserInfo {
	return {
		username:
			(user_metadata?.username as string) ??
			(user_metadata?.full_name as string) ??
			email.split('@')[0] ??
			'User',
		email,
		role: (user_metadata?.role as string) ?? 'Member',
		avatar_url: user_metadata?.avatar_url as string | undefined
	}
}

export default function account_tab() {
	const { user, sign_out } = use_auth()
	const { is_dark_mode } = use_app_context()
	const [info, set_info] = useState<UserInfo | undefined>(cached_info)
	const [is_loading, set_is_loading] = useState(!cached_info)
	const [error, set_error] = useState<string | undefined>(undefined)
	const has_fetched = useRef(false)

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'

	useEffect(() => {
		if (has_fetched.current || cached_info) {
			return
		}
		has_fetched.current = true

		set_is_loading(true)
		set_error(undefined)

		if (!user) {
			set_is_loading(false)
			set_error('No authenticated user found.')
			return
		}

		const defaults = get_default_info(
			user.email ?? '',
			user.user_metadata as Record<string, unknown> | undefined
		)

		;(async () => {
			try {
				const { data, error: err } = await supabase
					.from('users')
					.select('username, email, role, avatar_url')
					.eq('id', user.id)
					.single()

				if (err && err.code !== 'PGRST116') {
					set_error('Unable to load account details.')
					set_info(defaults)
				} else if (data) {
					const loaded: UserInfo = {
						username: data.username ?? defaults.username,
						email: data.email ?? defaults.email,
						role: data.role ?? defaults.role,
						avatar_url: data.avatar_url ?? defaults.avatar_url
					}
					cached_info = loaded
					set_info(loaded)
				} else {
					set_info(defaults)
				}
			} catch {
				set_error('Unable to load account details.')
				set_info(defaults)
			} finally {
				set_is_loading(false)
			}
		})()
	}, [user])

	function handle_sign_out() {
		cached_info = undefined
		sign_out()
	}

	if (is_loading) {
		return (
			<div className="page-layout">
				<div className="page-content">
					<div className="flex items-center justify-center py-20">
						<div className="loading-spinner" />
					</div>
				</div>
			</div>
		)
	}

	if (error && !info) {
		return (
			<div className="page-layout">
				<div className="page-content">
					<div
						className={`rounded-xl border p-12 text-center ${
							is_dark_mode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
						}`}
						role="alert"
					>
						<p className="text-sm text-red-500">{error}</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="page-layout">
			<div className="page-content">
				<div className="page-header mb-8">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">Account</h1>
						<p className={`text-sm mt-1 ${text_muted}`}>
							Manage your profile and account settings.
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2">
						<UserInfoCard info={info!} is_dark_mode={is_dark_mode} />
					</div>
					<div>
						<AccountActions is_dark_mode={is_dark_mode} on_sign_out={handle_sign_out} />
					</div>
				</div>
			</div>
		</div>
	)
}
