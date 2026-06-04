import { useState } from 'react'
import { User, Mail, KeyRound, Lock } from 'lucide-react'
import {
	input_field as Input,
	button_component as Button,
	social_button as SocialButton
} from '../../components/ui'
import type { AuthView } from '../AuthFlow/types'
import { supabase } from '../../config/supabase'

export default function sign_up({ set_view }: { set_view: (view: AuthView) => void }) {
	const [full_name, set_full_name] = useState('')
	const [email, set_email] = useState('')
	const [password, set_password] = useState('')
	const [confirm_password, set_confirm_password] = useState('')
	const [is_loading, set_is_loading] = useState(false)
	const [error, set_error] = useState('')

	const handle_submit = async (e: React.FormEvent) => {
		e.preventDefault()
		set_error('')
		if (!full_name || !email || !password || !confirm_password) return
		if (password !== confirm_password) {
			set_error('Passwords do not match')
			return
		}
		set_is_loading(true)

		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					full_name
				}
			}
		})

		set_is_loading(false)

		if (error) {
			set_error(error.message)
		} else {
			set_view('verify')
		}
	}

	return (
		<div className="space-y-6 relative z-10">
			<div>
				<h2 className="text-xl font-semibold text-white mb-1">Create an account</h2>
				<p className="text-sm text-zinc-400">Start building your computer vision pipelines</p>
			</div>
			<form className="space-y-4" onSubmit={handle_submit}>
				<div className="space-y-2">
					<Input
						placeholder="Full Name"
						type="text"
						icon={<User size={18} />}
						required
						value={full_name}
						onChange={(e) => set_full_name(e.target.value)}
					/>
					<Input
						placeholder="Email"
						type="email"
						icon={<Mail size={18} />}
						required
						value={email}
						onChange={(e) => set_email(e.target.value)}
					/>
					<Input
						placeholder="Create Password"
						type="password"
						icon={<KeyRound size={18} />}
						required
						value={password}
						onChange={(e) => set_password(e.target.value)}
					/>
					<Input
						placeholder="Confirm Password"
						type="password"
						icon={<Lock size={18} />}
						required
						value={confirm_password}
						onChange={(e) => set_confirm_password(e.target.value)}
					/>
				</div>
				{error && <p className="text-sm text-red-400 text-center">{error}</p>}
				<Button type="submit" isLoading={is_loading} disabled={is_loading}>
					Create Account
				</Button>
			</form>
			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<div className="w-full border-t border-zinc-800"></div>
				</div>
				<div className="relative flex justify-center text-xs">
					<span className="bg-zinc-950 px-2 text-zinc-500 font-medium">Or continue with</span>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<SocialButton
					icon={
						<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
							<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
						</svg>
					}
					provider="GitHub"
				/>
				<SocialButton
					icon={
						<svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
							<path
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								fill="#4285F4"
							/>
							<path
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								fill="#34A853"
							/>
							<path
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								fill="#FBBC05"
							/>
							<path
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								fill="#EA4335"
							/>
						</svg>
					}
					provider="Google"
				/>
			</div>
			<p className="text-center text-sm text-zinc-400">
				Already have an account?{' '}
				<button
					type="button"
					onClick={() => set_view('login')}
					className="font-medium text-white hover:underline"
				>
					Log in
				</button>
			</p>
		</div>
	)
}
