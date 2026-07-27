import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'
import { input_field as Input, button_component as Button } from '../../components/ui'
import { use_auth } from '../../contexts/auth_context'
import { format_auth_error } from '../../utils/auth_errors'
import type { AuthView } from '../AuthFlow/types'

export default function login({ set_view }: { set_view: (view: AuthView) => void }) {
	const { sign_in } = use_auth()
	const [email, set_email] = useState('')
	const [password, set_password] = useState('')
	const [is_loading, set_is_loading] = useState(false)
	const [error, set_error] = useState('')
	const handle_login = async (e: React.FormEvent) => {
		e.preventDefault()
		set_error('')
		if (!email || !password) return
		set_is_loading(true)
		const { error } = await sign_in(email, password)
		set_is_loading(false)
		if (error) {
			set_error(format_auth_error(error.message))
		}
	}
	return (
		<div className="space-y-6 relative z-10">
			<div>
				<h2 className="text-xl font-semibold text-white mb-1">Welcome back</h2>
				<p className="text-sm text-zinc-400">Enter your credentials to access your workspace</p>
			</div>
			<form onSubmit={handle_login} className="space-y-4">
				<div className="space-y-2">
					<Input
						placeholder="name@company.com"
						type="email"
						icon={<Mail size={18} />}
						required
						value={email}
						onChange={(e) => set_email(e.target.value)}
					/>
					<Input
						placeholder="••••••••"
						type="password"
						icon={<Lock size={18} />}
						required
						value={password}
						onChange={(e) => set_password(e.target.value)}
					/>
				</div>
				{error && <p className="text-sm text-red-400 text-center">{error}</p>}
				<div className="flex items-center justify-between">
					<label className="flex items-center gap-2 text-sm text-zinc-400">
						<input
							type="checkbox"
							className="rounded border-zinc-800 bg-zinc-900 text-blue-600 focus:ring-blue-500/50 focus:ring-offset-zinc-950"
						/>
						Remember me
					</label>
					<button
						type="button"
						onClick={() => set_view('forgot')}
						className="text-sm font-medium text-blue-400 hover:text-blue-300"
					>
						Forgot password?
					</button>
				</div>
				<Button type="submit" isLoading={is_loading}>
					Sign In
				</Button>
			</form>

			<p className="text-center text-sm text-zinc-400">
				Don't have an account?{' '}
				<button
					type="button"
					onClick={() => set_view('signup')}
					className="font-medium text-white hover:underline"
				>
					Sign up
				</button>
			</p>
		</div>
	)
}
