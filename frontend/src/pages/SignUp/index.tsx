import { useState } from 'react'
import { User, Mail, KeyRound, Lock } from 'lucide-react'
import { input_field as Input, button_component as Button } from '../../components/ui'
import { use_auth } from '../../contexts/auth_context'
import { format_auth_error } from '../../utils/auth_errors'
import type { AuthView } from '../AuthFlow/types'

export default function sign_up({ set_view }: { set_view: (view: AuthView) => void }) {
	const { sign_up } = use_auth()
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
		const { error } = await sign_up(email, password, { data: { full_name } })
		if (error) {
			set_error(format_auth_error(error.message))
		}
		set_is_loading(false)
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
