import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, ChevronRight, Search, Sun, Moon, Bell, LogOut, Settings } from 'lucide-react'
import { use_project_store } from '../store/projectStore'
import { use_app_context } from '../contexts/app_context'
import { use_auth } from '../contexts/auth_context'

function build_breadcrumbs(
	path_parts: string[],
	project_name: string | undefined
): { label: string }[] {
	const is_in_project = path_parts[0] === 'projects' && path_parts.length >= 3
	if (is_in_project) {
		const label = (path_parts[2]?.charAt(0).toUpperCase() ?? '') + (path_parts[2]?.slice(1) ?? '')
		return [{ label: 'Workspace' }, { label: project_name ?? 'Project' }, { label }]
	}
	const label = (path_parts[0]?.charAt(0).toUpperCase() ?? '') + (path_parts[0]?.slice(1) ?? '')
	return [{ label: 'Workspace' }, { label }]
}

function user_menu_dropdown({
	is_menu_open,
	is_dark_mode,
	initials,
	user_name,
	user_email,
	navigate,
	sign_out,
	set_is_menu_open
}: {
	is_menu_open: boolean
	is_dark_mode: boolean
	initials: string
	user_name: string | undefined
	user_email: string | undefined
	navigate: ReturnType<typeof useNavigate>
	sign_out: () => Promise<void>
	set_is_menu_open: (v: boolean) => void
}) {
	if (!is_menu_open) return undefined
	return (
		<div
			className={`absolute right-0 mt-2 w-72 rounded-xl border shadow-xl overflow-hidden z-50 ${
				is_dark_mode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
			}`}
		>
			<div
				className={`flex items-center gap-3 px-4 py-3 ${
					is_dark_mode ? 'bg-zinc-950/50' : 'bg-zinc-50'
				}`}
			>
				<div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0">
					<span className="text-sm font-bold">{initials}</span>
				</div>
				<div className="min-w-0 flex-1">
					<p
						className={`text-sm font-medium truncate ${
							is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
						}`}
					>
						{user_name ?? user_email?.split('@')[0] ?? 'User'}
					</p>
					<p className="text-xs text-zinc-500 truncate">{user_email ?? ''}</p>
					<p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Member</p>
				</div>
			</div>

			<button
				onClick={() => {
					navigate('/settings')
					set_is_menu_open(false)
				}}
				className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
					is_dark_mode
						? 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
						: 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
				}`}
			>
				<Settings size={16} />
				Settings
			</button>

			<div className={`h-px ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

			<button
				onClick={async () => {
					try {
						await sign_out()
						set_is_menu_open(false)
					} catch (error) {
						console.error('Sign out failed:', error)
					}
				}}
				className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
					is_dark_mode
						? 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800/50'
						: 'text-zinc-600 hover:text-red-600 hover:bg-zinc-100'
				}`}
			>
				<LogOut size={16} />
				Sign Out
			</button>
		</div>
	)
}

function header_actions(is_dark_mode: boolean, toggle_theme: () => void) {
	return (
		<>
			<button
				className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-colors w-48 lg:w-64 ${
					is_dark_mode
						? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
						: 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
				}`}
			>
				<Search size={14} />
				<span className="flex-1 text-left">Search...</span>
				<kbd
					className={`pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 ${
						is_dark_mode
							? 'bg-zinc-800 border-zinc-700 text-zinc-400'
							: 'bg-white border-zinc-200 text-zinc-500'
					}`}
				>
					<span className="text-xs">⌘</span>K
				</kbd>
			</button>

			<button className={`sm:hidden p-2 rounded-full ${is_dark_mode ? 'hover:bg-zinc-800/50 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}`}>
				<Search size={18} />
			</button>

			<button
				onClick={toggle_theme}
				className={`p-2 rounded-full transition-colors ${is_dark_mode ? 'hover:bg-zinc-800/50 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}`}
				title="Toggle Theme"
			>
				{is_dark_mode ? <Sun size={18} /> : <Moon size={18} />}
			</button>

			<button className={`p-2 rounded-full relative transition-colors ${is_dark_mode ? 'hover:bg-zinc-800/50 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}`}>
				<Bell size={18} />
				<span className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500 border ${is_dark_mode ? 'border-zinc-950' : 'border-white'}`} />
			</button>

			<div className={`w-px h-6 mx-1 hidden sm:block ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
		</>
	)
}

export function header_content() {
	const { is_dark_mode, toggle_theme, open_mobile_menu } = use_app_context()
	const { user, sign_out } = use_auth()
	const navigate = useNavigate()
	const [is_menu_open, set_is_menu_open] = useState(false)
	const [menu_el, set_menu_el] = useState<HTMLDivElement | undefined>(undefined)
	const menu_ref = useCallback((el: HTMLDivElement | null) => {
		set_menu_el(el ?? undefined)
	}, [])
	const location = useLocation()
	const path_parts = location.pathname.split('/').filter(Boolean)
	const project_id = path_parts[0] === 'projects' ? path_parts[1] : undefined
	const projects = use_project_store((s) => s.projects)

	const project = project_id ? projects.find((p) => p.id === project_id) : undefined

	const breadcrumbs = build_breadcrumbs(path_parts, project?.name)

	const user_name = user?.user_metadata?.full_name as string | undefined
	const initials = user_name
		? user_name
				.split(' ')
				.map((s) => s[0])
				.join('')
				.toUpperCase()
				.slice(0, 2)
		: (user?.email?.[0]?.toUpperCase() ?? '?')

	useEffect(() => {
		function handle_click_outside(e: MouseEvent) {
			if (menu_el && !menu_el.contains(e.target as Node)) {
				set_is_menu_open(false)
			}
		}
		document.addEventListener('mousedown', handle_click_outside)
		return () => document.removeEventListener('mousedown', handle_click_outside)
	}, [menu_el])

	const header_classes = is_dark_mode
		? 'bg-zinc-950/80 border-zinc-800'
		: 'bg-white/80 border-zinc-200'

	return (
		<header
			className={`flex h-16 shrink-0 items-center justify-between border-b px-4 lg:px-8 backdrop-blur-md z-10 box-border ${header_classes}`}
		>
			<div className="flex items-center gap-4">
				<button
					className="lg:hidden p-2 rounded-md hover:bg-zinc-800/50 text-zinc-400"
					onClick={open_mobile_menu}
				>
					<Menu size={20} />
				</button>

				<div className="hidden md:flex items-center gap-2 text-sm">
					{breadcrumbs.map((crumb, i) => (
						<span key={i} className="flex items-center gap-2">
							{i > 0 && <ChevronRight size={14} className="text-zinc-600" />}
							<span
								className={
									i === breadcrumbs.length - 1
										? `${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'} font-medium`
										: 'text-zinc-500'
								}
							>
								{crumb.label}
							</span>
						</span>
					))}
				</div>
			</div>

			<div className="flex items-center gap-3 lg:gap-4">
				{header_actions(is_dark_mode, toggle_theme)}

				<div ref={menu_ref} className="relative">
					<button
						onClick={() => set_is_menu_open(!is_menu_open)}
						className="flex items-center gap-2 hover:opacity-80 transition-opacity"
					>
						<div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white border-2 border-zinc-950 shadow-sm">
							<span className="text-xs font-bold">{initials}</span>
						</div>
					</button>

					{user_menu_dropdown({
						is_menu_open,
						is_dark_mode,
						initials,
						user_name,
						user_email: user?.email,
						navigate,
						sign_out,
						set_is_menu_open
					})}
				</div>
			</div>
		</header>
	)
}
