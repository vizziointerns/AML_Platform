import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { Mail, ArrowRight, CheckCircle2, Box, User, Cpu, Zap, Sparkles } from 'lucide-react'
import { input_field as Input, button_component as Button } from '../../components/ui'
import { supabase } from '../../utils/supabase'
import Login from '../Login'
import SignUp from '../SignUp'
import type { AuthView } from './types'

const VIEW_TO_PATH: Record<AuthView, string> = {
	login: '/login',
	signup: '/signup',
	forgot: '/forgot',
	verify: '/login',
	onboarding: '/login',
	invite: '/login'
}

const ROUTE_VIEWS: AuthView[] = ['login', 'signup', 'forgot']

export default function auth_flow() {
	const navigate = useNavigate()
	const location = useLocation()

	const route_to_view: AuthView =
		location.pathname === '/signup'
			? 'signup'
			: location.pathname === '/forgot'
				? 'forgot'
				: 'login'

	const [view, set_view_state] = useState<AuthView>(route_to_view)
	const [verify_email, set_verify_email] = useState('')

	function set_view(new_view: AuthView) {
		set_view_state(new_view)
		const path = VIEW_TO_PATH[new_view]
		if (path && path !== location.pathname) {
			navigate(path, { replace: true })
		}
	}

	function handle_signup(email: string) {
		set_verify_email(email)
		set_view('verify')
	}

	useEffect(() => {
		if (ROUTE_VIEWS.includes(view) && view !== route_to_view) {
			set_view_state(route_to_view)
		}
	}, [location.pathname])

	return (
		<div className="min-h-screen w-full bg-[#09090b] flex flex-col items-center justify-center p-4 relative font-sans text-zinc-200">
			<div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
				<div className="absolute top-[-10%] w-[800px] h-[600px] bg-blue-600/10 rounded-[100%] blur-[120px] opacity-70" />
				<div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-[100%] blur-[100px] opacity-70" />
				<div
					className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
					style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}
				/>
			</div>

			<div className="w-full max-w-[420px] relative z-10 flex flex-col items-center mb-8">
				<div className="h-12 w-12 rounded-xl border border-zinc-800 bg-zinc-950/50 shadow-xl flex items-center justify-center mb-4">
					<Box className="w-6 h-6 text-blue-500" />
				</div>
				<h1 className="text-2xl font-semibold tracking-tight text-white mb-1">AML Platform</h1>
				<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
					<span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
					System Auth
				</p>
			</div>

			<div className="w-full max-w-[420px] bg-zinc-950/40 backdrop-blur-xl border border-zinc-800/60 rounded-2xl p-8 shadow-2xl relative overflow-hidden z-10">
				<div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
				{view === 'login' && <Login set_view={set_view} />}
				{view === 'signup' && <SignUp set_view={set_view} on_signup={handle_signup} />}
				{view === 'forgot' && React.createElement(forgot_view, { set_view })}
				{view === 'verify' && React.createElement(verify_view, { email: verify_email })}
				{view === 'onboarding' && React.createElement(onboarding_view)}
				{view === 'invite' && React.createElement(invite_view, { set_view })}
			</div>

			<div className="mt-8 flex gap-6 text-xs text-zinc-500 relative z-10">
				<button
					onClick={() => set_view('onboarding')}
					className="hover:text-zinc-300 font-medium transition-colors"
				>
					Test Onboarding
				</button>
				<button
					onClick={() => set_view('invite')}
					className="hover:text-zinc-300 font-medium transition-colors"
				>
					Test Invite
				</button>
			</div>
		</div>
	)
}

// Sub-components

function forgot_view({ set_view }: { set_view: (view: AuthView) => void }) {
	const [is_success, set_is_success] = useState(false)
	if (is_success) {
		return (
			<div className="space-y-6 text-center relative z-10">
				<div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20 shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)]">
					<Mail className="w-8 h-8 text-blue-500" />
				</div>
				<div>
					<h2 className="text-xl font-semibold text-white mb-1">Check your email</h2>
					<p className="text-sm text-zinc-400 max-w-[260px] mx-auto">
						We've sent a password reset link to your email address.
					</p>
				</div>
				<Button onClick={() => set_view('login')} variant="outline" className="mt-4">
					Back to login
				</Button>
			</div>
		)
	}
	return (
		<div className="space-y-6 relative z-10">
			<div>
				<h2 className="text-xl font-semibold text-white mb-1">Reset password</h2>
				<p className="text-sm text-zinc-400">Enter your email and we'll send you a reset link</p>
			</div>
			<form
				onSubmit={(e) => {
					e.preventDefault()
					set_is_success(true)
				}}
				className="space-y-4"
			>
				<Input placeholder="name@company.com" type="email" icon={<Mail size={18} />} required />
				<Button type="submit">Send Reset Link</Button>
				<Button type="button" variant="ghost" onClick={() => set_view('login')}>
					Back to login
				</Button>
			</form>
		</div>
	)
}

function verify_view({ email }: { email: string }) {
	const [code, set_code] = useState<string[]>(Array(6).fill(''))
	const [is_loading, set_is_loading] = useState(false)
	const [error, set_error] = useState('')
	const input_refs = useRef<(HTMLInputElement | null)[]>(
		Array(6).fill(undefined) as (HTMLInputElement | null)[]
	)

	function handle_change(index: number, value: string) {
		if (!/^\d?$/.test(value)) return
		const new_code = [...code]
		new_code[index] = value
		set_code(new_code)
		if (value && index < 5) {
			input_refs.current[index + 1]?.focus()
		}
	}

	function handle_key_down(index: number, e: React.KeyboardEvent) {
		if (e.key === 'Backspace' && !code[index] && index > 0) {
			input_refs.current[index - 1]?.focus()
		}
	}

	async function handle_verify() {
		const token = code.join('')
		if (token.length !== 6) return
		set_is_loading(true)
		set_error('')
		const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
		set_is_loading(false)
		if (error) {
			set_error(error.message)
		}
	}

	async function handle_resend() {
		await supabase.auth.signInWithOtp({ email })
	}

	return (
		<div className="space-y-6 text-center relative z-10">
			<div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20 shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)]">
				<Sparkles className="w-7 h-7 text-blue-500" />
			</div>
			<div>
				<h2 className="text-xl font-semibold text-white mb-1">Verify your email</h2>
				<p className="text-sm text-zinc-400 max-w-[260px] mx-auto">
					We've sent a 6-digit verification code to {email}
				</p>
			</div>
			<div className="flex justify-center gap-2 my-6">
				{code.map((digit, i) => (
					<input
						key={i}
						ref={(el) => {
							input_refs.current[i] = el
						}}
						className="w-10 h-12 bg-zinc-900 border border-zinc-800 rounded-md text-center text-lg font-medium text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-inner outline-none transition-all"
						maxLength={1}
						value={digit}
						onChange={(e) => handle_change(i, e.target.value)}
						onKeyDown={(e) => handle_key_down(i, e)}
					/>
				))}
			</div>
			{error && <p className="text-sm text-red-400">{error}</p>}
			<Button onClick={handle_verify} isLoading={is_loading} disabled={code.join('').length !== 6}>
				Verify Account
			</Button>
			<p className="text-xs text-zinc-500 mt-4">
				Didn't receive code?{' '}
				<button
					type="button"
					onClick={handle_resend}
					className="text-blue-400 font-medium hover:text-blue-300"
				>
					Resend
				</button>
			</p>
		</div>
	)
}

function onboarding_view() {
	const [step, set_step] = useState(1)
	const [is_loading, set_is_loading] = useState(false)
	const next_step = () => {
		if (step === 1) set_step(2)
		else {
			set_is_loading(true)
			setTimeout(() => set_is_loading(false), 1500)
		}
	}
	return (
		<div className="space-y-6 relative z-10">
			<div className="flex gap-2 mb-6">
				<div className="h-1.5 flex-1 bg-blue-600 rounded-full shadow-[0_0_10px_-2px_rgba(37,99,235,0.8)]"></div>
				<div
					className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${step === 2 ? 'bg-blue-600 shadow-[0_0_10px_-2px_rgba(37,99,235,0.8)]' : 'bg-zinc-800'}`}
				></div>
			</div>
			{step === 1 ? (
				<motion.div
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					className="space-y-6"
				>
					<div>
						<h2 className="text-xl font-semibold text-white mb-1">Set up your workspace</h2>
						<p className="text-sm text-zinc-400">
							Where will your team manage computer vision data?
						</p>
					</div>
					<div className="space-y-4">
						<div className="space-y-2">
							<label className="text-sm font-medium text-zinc-300">Workspace Name</label>
							<Input placeholder="Acme Corp" autoFocus />
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium text-zinc-300">Workspace Slug</label>
							<div className="flex items-center">
								<span className="pl-3 pr-1 py-2.5 bg-zinc-900/80 border border-r-0 border-zinc-800 rounded-l-lg text-zinc-500 text-sm h-[42px] leading-relaxed">
									visioncore.ai/
								</span>
								<input
									type="text"
									className="w-full bg-zinc-900/50 border border-zinc-800 rounded-r-lg px-2 py-2.5 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 h-[42px]"
									placeholder="acme"
								/>
							</div>
						</div>
					</div>
					<Button onClick={next_step} className="mt-8">
						Continue <ArrowRight size={16} />
					</Button>
				</motion.div>
			) : (
				<motion.div
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					className="space-y-6"
				>
					<div>
						<h2 className="text-xl font-semibold text-white mb-1">What's your primary goal?</h2>
						<p className="text-sm text-zinc-400">We'll tailor your dashboard to your needs</p>
					</div>
					<div className="grid gap-3">
						{[
							{
								title: 'Data Annotation',
								desc: 'Label datasets at scale',
								icon: <CheckCircle2 size={18} />
							},
							{
								title: 'Model Training',
								desc: 'Train custom vision models',
								icon: <Cpu size={18} />
							},
							{
								title: 'Deployment pipeline',
								desc: 'Deploy via API or Edge',
								icon: <Zap size={18} />
							}
						].map((item, i) => (
							<button
								key={i}
								className="flex items-start text-left gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-colors focus:ring-2 focus:ring-blue-500/50 outline-none"
							>
								<div className="text-zinc-400 mt-0.5">{item.icon}</div>
								<div>
									<div className="font-medium text-white text-sm mb-0.5">{item.title}</div>
									<div className="text-xs text-zinc-500">{item.desc}</div>
								</div>
							</button>
						))}
					</div>
					<Button onClick={next_step} isLoading={is_loading}>
						Complete Setup
					</Button>
				</motion.div>
			)}
		</div>
	)
}

function invite_view({ set_view }: { set_view: (view: AuthView) => void }) {
	return (
		<div className="space-y-6 text-center relative z-10">
			<div className="flex justify-center -space-x-3 mb-6">
				<div className="w-14 h-14 rounded-full bg-blue-600 border-4 border-zinc-950 flex items-center justify-center text-white font-semibold text-lg relative z-10">
					S
				</div>
				<div className="w-14 h-14 rounded-full border-4 border-zinc-950 border-dashed bg-zinc-800 flex items-center justify-center text-zinc-400 relative z-0">
					<User size={20} />
				</div>
			</div>
			<div>
				<h2 className="text-xl font-semibold text-white mb-1">Join Acme Corp</h2>
				<p className="text-sm text-zinc-400 max-w-[260px] mx-auto">
					Sarah has invited you to join their workspace as an{' '}
					<span className="text-zinc-200 font-medium">Annotator</span>.
				</p>
			</div>
			<div className="pt-2 space-y-3">
				<Button onClick={() => set_view('login')}>Accept Invitation</Button>
				<Button variant="ghost" onClick={() => set_view('login')}>
					Decline
				</Button>
			</div>
		</div>
	)
}
