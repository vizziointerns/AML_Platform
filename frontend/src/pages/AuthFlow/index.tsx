import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
	Mail,
	Lock,
	ArrowRight,
	CheckCircle2,
	Box,
	User,
	Cpu,
	Zap,
	KeyRound,
	Sparkles
} from 'lucide-react'
import {
	input_field as Input,
	button_component as Button,
	social_button as SocialButton
} from '../../components/ui'

export type AuthView = 'login' | 'signup' | 'forgot' | 'verify' | 'onboarding' | 'invite'

export default function auth_flow({ on_complete }: { on_complete: () => void }) {
	const [view, set_view] = useState<AuthView>('login')

	const page_variants = {
		initial: { opacity: 0, y: 10, scale: 0.98 },
		animate: { opacity: 1, y: 0, scale: 1 },
		exit: { opacity: 0, y: -10, scale: 0.98 },
		transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
	}

	const render_view = () => {
		switch (view) {
			case 'login':
				return login_view({ set_view, on_complete })
			case 'signup':
				return signup_view({ set_view })
			case 'forgot':
				return forgot_view({ set_view })
			case 'verify':
				return verify_view({ set_view })
			case 'onboarding':
				return onboarding_view({ on_complete })
			case 'invite':
				return invite_view({ set_view, on_complete })
		}
	}

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
				<h1 className="text-2xl font-semibold tracking-tight text-white mb-1">VisionCore</h1>
				<p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
					<span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
					System Auth
				</p>
			</div>

			<div className="w-full max-w-[420px] bg-zinc-950/40 backdrop-blur-xl border border-zinc-800/60 rounded-2xl p-8 shadow-2xl relative overflow-hidden z-10">
				<div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
				<AnimatePresence mode="wait">
					<motion.div
						key={view}
						initial="initial"
						animate="animate"
						exit="exit"
						variants={page_variants}
					>
						{render_view()}
					</motion.div>
				</AnimatePresence>
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

function login_view({
	set_view,
	on_complete
}: {
	set_view: (view: AuthView) => void
	on_complete: () => void
}) {
	const [is_loading, set_is_loading] = useState(false)
	const handle_login = (e: React.FormEvent) => {
		e.preventDefault()
		set_is_loading(true)
		setTimeout(() => {
			set_is_loading(false)
			on_complete()
		}, 1500)
	}
	return (
		<div className="space-y-6 relative z-10">
			<div>
				<h2 className="text-xl font-semibold text-white mb-1">Welcome back</h2>
				<p className="text-sm text-zinc-400">Enter your credentials to access your workspace</p>
			</div>
			<form onSubmit={handle_login} className="space-y-4">
				<div className="space-y-2">
					<Input placeholder="name@company.com" type="email" icon={<Mail size={18} />} required />
					<Input placeholder="••••••••" type="password" icon={<Lock size={18} />} required />
				</div>
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

function signup_view({ set_view }: { set_view: (view: AuthView) => void }) {
	return (
		<div className="space-y-6 relative z-10">
			<div>
				<h2 className="text-xl font-semibold text-white mb-1">Create an account</h2>
				<p className="text-sm text-zinc-400">Start building your computer vision pipelines</p>
			</div>
			<form
				className="space-y-4"
				onSubmit={(e) => {
					e.preventDefault()
					set_view('verify')
				}}
			>
				<div className="space-y-2">
					<Input placeholder="Full Name" type="text" icon={<User size={18} />} required />
					<Input placeholder="Work Email" type="email" icon={<Mail size={18} />} required />
					<Input
						placeholder="Create Password"
						type="password"
						icon={<KeyRound size={18} />}
						required
					/>
				</div>
				<Button type="submit">Create Account</Button>
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

function verify_view({ set_view }: { set_view: (view: AuthView) => void }) {
	return (
		<div className="space-y-6 text-center relative z-10">
			<div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20 shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)]">
				<Sparkles className="w-7 h-7 text-blue-500" />
			</div>
			<div>
				<h2 className="text-xl font-semibold text-white mb-1">Verify your email</h2>
				<p className="text-sm text-zinc-400 max-w-[260px] mx-auto">
					We've sent a 6-digit verification code to your email address.
				</p>
			</div>
			<div className="flex justify-center gap-2 my-6">
				{[1, 2, 3, 4, 5, 6].map((i) => (
					<input
						key={i}
						className="w-10 h-12 bg-zinc-900 border border-zinc-800 rounded-md text-center text-lg font-medium text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-inner outline-none transition-all"
						maxLength={1}
					/>
				))}
			</div>
			<Button onClick={() => set_view('onboarding')}>Verify Account</Button>
			<p className="text-xs text-zinc-500 mt-4">
				Didn't receive code?{' '}
				<button type="button" className="text-blue-400 font-medium hover:text-blue-300">
					Resend
				</button>
			</p>
		</div>
	)
}

function onboarding_view({ on_complete }: { on_complete: () => void }) {
	const [step, set_step] = useState(1)
	const [is_loading, set_is_loading] = useState(false)
	const next_step = () => {
		if (step === 1) set_step(2)
		else {
			set_is_loading(true)
			setTimeout(() => {
				on_complete()
			}, 1500)
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

function invite_view({
	set_view,
	on_complete
}: {
	set_view: (view: AuthView) => void
	on_complete: () => void
}) {
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
				<Button onClick={on_complete}>Accept Invitation</Button>
				<Button variant="ghost" onClick={() => set_view('login')}>
					Decline
				</Button>
			</div>
		</div>
	)
}
