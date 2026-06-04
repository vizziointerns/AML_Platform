import { useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Menu, ChevronRight, Search, Sun, Moon, Bell, User, LogOut } from 'lucide-react'
import { use_project_store } from '../store/projectStore'
import { use_app_context } from '../contexts/app_context'
import { use_auth } from '../contexts/auth_context'
import type { User as SupabaseUser } from '@supabase/supabase-js'

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

function get_profile_dropdown(
	is_profile_open: boolean,
	set_is_profile_open: (open: boolean) => void,
	is_dark: boolean,
	user: SupabaseUser | undefined,
	sign_out: () => void
) {
	if (!is_profile_open) return undefined

	return (
		<>
			<div className="fixed inset-0 z-40" onClick={() => set_is_profile_open(false)} />
			<div
				className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-50 border py-1 ${
					is_dark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
				}`}
			>
				<div className="px-4 py-2 border-b border-zinc-800/50 mb-1">
					<p className={`text-sm truncate ${is_dark ? 'text-white' : 'text-zinc-900'}`}>
						{user?.user_metadata?.full_name || 'User'}
					</p>
					<p className="text-xs text-zinc-500 truncate">{user?.email}</p>
				</div>
				<button
					onClick={() => {
						set_is_profile_open(false)
						sign_out()
					}}
					className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
						is_dark
							? 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
							: 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
					}`}
				>
					<LogOut size={14} />
					Sign Out
				</button>
			</div>
		</>
	)
}

function breadcrumbs_list({
	breadcrumbs,
	is_dark
}: {
	breadcrumbs: { label: string }[]
	is_dark: boolean
}) {
	return (
		<>
			{breadcrumbs.map((crumb, i) => {
				const is_last = i === breadcrumbs.length - 1
				const text_color = is_last
					? is_dark
						? 'text-zinc-100 font-medium'
						: 'text-zinc-900 font-medium'
					: 'text-zinc-500'

				return (
					<span key={i} className="flex items-center gap-2">
						{i > 0 && <ChevronRight size={14} className="text-zinc-600" />}
						<span className={text_color}>{crumb.label}</span>
					</span>
				)
			})}
		</>
	)
}

export function header_content() {
	const { is_dark_mode, toggle_theme, open_mobile_menu } = use_app_context()
	const { user, sign_out } = use_auth()
	const [is_profile_open, set_is_profile_open] = useState(false)
	const location = useLocation()
	const path_parts = location.pathname.split('/').filter(Boolean)
	const project_id = path_parts[0] === 'projects' ? path_parts[1] : undefined
	const projects = use_project_store((s) => s.projects)

	const project = project_id ? projects.find((p) => p.id === project_id) : undefined

	const breadcrumbs = build_breadcrumbs(path_parts, project?.name)

	const is_dark = is_dark_mode
	const header_classes = is_dark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white/80 border-zinc-200'

	const profile_dropdown = get_profile_dropdown(
		is_profile_open,
		set_is_profile_open,
		is_dark,
		user,
		sign_out
	)

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
					{breadcrumbs_list({ breadcrumbs, is_dark })}
				</div>
			</div>

			<div className="flex items-center gap-3 lg:gap-4">
				<button
					className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-colors w-48 lg:w-64 ${
						is_dark
							? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
							: 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
					}`}
				>
					<Search size={14} />
					<span className="flex-1 text-left">Search...</span>
					<kbd
						className={`pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 ${
							is_dark
								? 'bg-zinc-800 border-zinc-700 text-zinc-400'
								: 'bg-white border-zinc-200 text-zinc-500'
						}`}
					>
						<span className="text-xs">⌘</span>K
					</kbd>
				</button>

				<button className="sm:hidden p-2 rounded-full hover:bg-zinc-800/50 text-zinc-400">
					<Search size={18} />
				</button>

				<button
					onClick={toggle_theme}
					className="p-2 rounded-full hover:bg-zinc-800/50 text-zinc-400 transition-colors"
					title="Toggle Theme"
				>
					{is_dark ? <Sun size={18} /> : <Moon size={18} />}
				</button>

				<button className="p-2 rounded-full hover:bg-zinc-800/50 text-zinc-400 relative transition-colors">
					<Bell size={18} />
					<span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500 border border-zinc-950" />
				</button>

				<div className="w-px h-6 bg-zinc-800 mx-1 hidden sm:block" />

				<div className="relative">
					<button
						className="flex items-center gap-2 hover:opacity-80 transition-opacity"
						onClick={() => set_is_profile_open(!is_profile_open)}
					>
						<div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white border-2 border-zinc-950 shadow-sm">
							<User size={14} />
						</div>
					</button>

					{profile_dropdown}
				</div>
			</div>
		</header>
	)
}
