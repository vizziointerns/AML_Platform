import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
	Menu,
	ChevronRight,
	Search,
	Sun,
	Moon,
	Bell,
	LogOut,
	Settings,
	X,
	AlertCircle
} from 'lucide-react'
import { use_project_store, type Project } from '../store/projectStore'
import { use_app_context } from '../contexts/app_context'
import { use_auth } from '../contexts/auth_context'
import { use_alerts, type Alert } from '../hooks/use_alerts'
import { supabase } from '../utils/supabase'

function build_breadcrumbs(
	path_parts: string[],
	project_name: string | undefined,
	project_id?: string
): { label: string; path?: string }[] {
	if (path_parts[0] === 'projects' && path_parts.length >= 3 && project_id) {
		const sub_label =
			(path_parts[2]?.charAt(0).toUpperCase() ?? '') + (path_parts[2]?.slice(1) ?? '')
		return [
			{ label: 'Workspace' },
			{ label: 'Project', path: '/projects' },
			{ label: project_name ?? 'Project', path: `/projects/${project_id}/dashboard` },
			{ label: sub_label }
		]
	}
	const label = (path_parts[0]?.charAt(0).toUpperCase() ?? '') + (path_parts[0]?.slice(1) ?? '')
	return [{ label: 'Workspace' }, { label, path: path_parts[0] === 'home' ? '/home' : undefined }]
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

interface SearchResult {
	id: string
	name: string
	type: 'Project' | 'Dataset'
	navigate_to: string
}

interface ProjectSearchResult {
	id: string
	name: string
}

interface DatasetSearchResult {
	id: string
	name: string
	project_id: string
}

function alert_ids_key(alerts: Alert[]): string {
	return alerts
		.map((a) => a.id)
		.sort()
		.join(',')
}

function search_dropdown({
	search_query,
	projects,
	search_project_results,
	dataset_results,
	navigate,
	set_search_query,
	is_dark_mode
}: {
	search_query: string
	projects: Project[]
	search_project_results: ProjectSearchResult[]
	dataset_results: DatasetSearchResult[]
	navigate: ReturnType<typeof useNavigate>
	set_search_query: (v: string) => void
	is_dark_mode: boolean
}) {
	const store_projects: SearchResult[] = search_query
		? projects
				.filter((p) => p.name.toLowerCase().includes(search_query.toLowerCase()))
				.map((p) => ({
					id: p.id,
					name: p.name,
					type: 'Project' as const,
					navigate_to: `/projects/${p.id}/dashboard`
				}))
		: []

	const fetched_projects: SearchResult[] = search_project_results.map((p) => ({
		id: p.id,
		name: p.name,
		type: 'Project' as const,
		navigate_to: `/projects/${p.id}/dashboard`
	}))

	const filtered_projects = store_projects.length > 0 ? store_projects : fetched_projects

	const filtered_datasets: SearchResult[] = dataset_results.map((d) => ({
		id: d.id,
		name: d.name,
		type: 'Dataset' as const,
		navigate_to: `/projects/${d.project_id}/datasets`
	}))

	const all_results = [...filtered_projects, ...filtered_datasets]
	if (all_results.length === 0) return undefined

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'

	return (
		<div
			className={`absolute left-0 right-0 mt-1 rounded-lg border shadow-xl overflow-hidden z-50 ${
				is_dark_mode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
			}`}
		>
			{all_results.slice(0, 8).map((r) => (
				<button
					key={`${r.type}-${r.id}`}
					onClick={() => {
						navigate(r.navigate_to)
						set_search_query('')
					}}
					className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
						is_dark_mode ? 'text-zinc-300' : 'text-zinc-700'
					} ${hover_bg} transition-colors`}
				>
					<Search size={14} className="shrink-0 text-zinc-500" />
					<span className="truncate">{r.name}</span>
					<span
						className={`text-xs ml-auto px-1.5 py-0.5 rounded font-medium ${
							r.type === 'Project'
								? is_dark_mode
									? 'bg-blue-500/10 text-blue-400'
									: 'bg-blue-50 text-blue-700'
								: is_dark_mode
									? 'bg-emerald-500/10 text-emerald-400'
									: 'bg-emerald-50 text-emerald-700'
						}`}
					>
						{r.type}
					</span>
				</button>
			))}
			{all_results.length > 8 && (
				<div
					className={`px-3 py-1.5 text-xs ${text_muted} border-t ${
						is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
					}`}
				>
					{all_results.length - 8} more results...
				</div>
			)}
		</div>
	)
}

function alerts_dropdown({
	is_alert_open,
	alerts,
	is_loading,
	is_dark_mode
}: {
	is_alert_open: boolean
	alerts: Alert[]
	is_loading: boolean
	is_dark_mode: boolean
}) {
	if (!is_alert_open) return undefined

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'

	return (
		<div
			className={`absolute right-0 mt-2 w-80 rounded-xl border shadow-xl overflow-hidden z-50 ${
				is_dark_mode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
			}`}
		>
			<div
				className={`flex items-center gap-2 px-4 py-3 border-b ${
					is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
				}`}
			>
				<AlertCircle size={16} className="text-amber-500" />
				<span className={`text-sm font-semibold ${text_heading}`}>Alerts</span>
			</div>
			<div className="max-h-80 overflow-y-auto">
				{is_loading ? (
					<div className="p-4 space-y-3">
						<div
							className={`h-10 rounded-lg animate-pulse ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
						/>
						<div
							className={`h-10 rounded-lg animate-pulse ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
						/>
					</div>
				) : alerts.length === 0 ? (
					<p className={`text-sm ${text_muted} text-center py-6`}>
						No alerts — everything looks good
					</p>
				) : (
					alerts.map((alert) => {
						const colors =
							alert.severity === 'danger'
								? is_dark_mode
									? 'bg-red-500/5 border-red-500/20 text-red-400'
									: 'bg-red-50 border-red-200 text-red-800'
								: alert.severity === 'warning'
									? is_dark_mode
										? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
										: 'bg-amber-50 border-amber-200 text-amber-800'
									: is_dark_mode
										? 'bg-blue-500/5 border-blue-500/20 text-blue-400'
										: 'bg-blue-50 border-blue-200 text-blue-800'
						const icon_color =
							alert.severity === 'danger'
								? 'text-red-500'
								: alert.severity === 'warning'
									? 'text-amber-500'
									: 'text-blue-500'
						return (
							<div key={alert.id} className={`m-2 p-3 rounded-lg border ${colors}`}>
								<div className="flex gap-2 text-sm">
									<AlertCircle size={16} className={`shrink-0 mt-0.5 ${icon_color}`} />
									<div>
										<div className="font-medium">{alert.title}</div>
										<div className="text-xs mt-0.5 opacity-70">{alert.description}</div>
									</div>
								</div>
							</div>
						)
					})
				)}
			</div>
		</div>
	)
}

function left_section({
	is_dark_mode,
	breadcrumbs,
	open_mobile_menu,
	navigate
}: {
	is_dark_mode: boolean
	breadcrumbs: { label: string; path?: string }[]
	open_mobile_menu: () => void
	navigate: (path: string) => void
}) {
	return (
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
						{crumb.path && i < breadcrumbs.length - 1 ? (
							<button
								onClick={() => navigate(crumb.path!)}
								className={`cursor-pointer hover:text-zinc-300 dark:hover:text-zinc-600 ${'text-zinc-500'}`}
							>
								{crumb.label}
							</button>
						) : (
							<span
								className={
									i === breadcrumbs.length - 1
										? `${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'} font-medium`
										: 'text-zinc-500'
								}
							>
								{crumb.label}
							</span>
						)}
					</span>
				))}
			</div>
		</div>
	)
}

function search_bar({
	is_dark_mode,
	search_query,
	set_search_query,
	search_ref,
	projects,
	search_project_results,
	dataset_results,
	navigate
}: {
	is_dark_mode: boolean
	search_query: string
	set_search_query: (v: string) => void
	search_ref: React.RefObject<HTMLDivElement | null>
	projects: Project[]
	search_project_results: ProjectSearchResult[]
	dataset_results: DatasetSearchResult[]
	navigate: ReturnType<typeof useNavigate>
}) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	return (
		<div ref={search_ref} className="relative hidden sm:block">
			<div
				className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-colors w-48 lg:w-64 ${
					is_dark_mode
						? 'bg-zinc-900 border-zinc-800 text-zinc-400'
						: 'bg-zinc-100 border-zinc-200 text-zinc-500'
				}`}
			>
				<Search size={14} className="shrink-0" />
				<input
					type="text"
					value={search_query}
					onChange={(e) => set_search_query(e.target.value)}
					placeholder="Search..."
					className="flex-1 bg-transparent border-none outline-none text-sm min-w-0"
					onKeyDown={(e) => {
						if (e.key === 'Enter' && search_query.trim()) {
							navigate('/projects')
							set_search_query('')
						}
					}}
				/>
				{search_query && (
					<button onClick={() => set_search_query('')} className="shrink-0">
						<X size={14} className={text_muted} />
					</button>
				)}
			</div>
			{search_dropdown({
				search_query,
				projects,
				search_project_results,
				dataset_results,
				navigate,
				set_search_query,
				is_dark_mode
			})}
		</div>
	)
}

function right_actions({
	is_dark_mode,
	is_home_page,
	toggle_theme,
	search_query,
	set_search_query,
	search_ref,
	projects,
	search_project_results,
	dataset_results,
	navigate,
	is_alert_open,
	set_alert_open,
	alert_ref,
	has_unviewed_alerts,
	set_has_unviewed_alerts,
	menu_ref,
	is_menu_open,
	set_is_menu_open,
	sign_out,
	initials,
	user_name,
	user_email,
	alerts,
	is_loading
}: {
	is_dark_mode: boolean
	is_home_page: boolean
	toggle_theme: () => void
	search_query: string
	set_search_query: (v: string) => void
	search_ref: React.RefObject<HTMLDivElement | null>
	projects: Project[]
	search_project_results: ProjectSearchResult[]
	dataset_results: DatasetSearchResult[]
	navigate: ReturnType<typeof useNavigate>
	is_alert_open: boolean
	set_alert_open: (v: boolean) => void
	alert_ref: React.RefObject<HTMLDivElement | null>
	has_unviewed_alerts: boolean
	set_has_unviewed_alerts: (v: boolean) => void
	menu_ref: (el: HTMLDivElement | null) => void
	is_menu_open: boolean
	set_is_menu_open: (v: boolean) => void
	sign_out: () => Promise<void>
	initials: string
	user_name: string | undefined
	user_email: string | undefined
	alerts: Alert[]
	is_loading: boolean
}) {
	return (
		<div className="flex items-center gap-3 lg:gap-4">
			{is_home_page &&
				search_bar({
					is_dark_mode,
					search_query,
					set_search_query,
					search_ref,
					projects,
					search_project_results,
					dataset_results,
					navigate
				})}

			{is_home_page && (
				<button
					className={`sm:hidden p-2 rounded-full ${is_dark_mode ? 'hover:bg-zinc-800/50 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}`}
				>
					<Search size={18} />
				</button>
			)}

			<button
				onClick={toggle_theme}
				className={`p-2 rounded-full transition-colors ${is_dark_mode ? 'hover:bg-zinc-800/50 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}`}
				title="Toggle Theme"
			>
				{is_dark_mode ? <Sun size={18} /> : <Moon size={18} />}
			</button>

			<div ref={alert_ref} className="relative">
				<button
					onClick={() => {
						set_alert_open(!is_alert_open)
						if (!is_alert_open) {
							set_has_unviewed_alerts(false)
							localStorage.setItem(
								`last_viewed_alert_ids_${user_email ?? ''}`,
								alert_ids_key(alerts)
							)
						}
					}}
					className={`p-2 rounded-full relative transition-colors ${is_dark_mode ? 'hover:bg-zinc-800/50 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'}`}
					title="Alerts"
				>
					<Bell size={18} />
					{alerts.length > 0 && has_unviewed_alerts && (
						<span
							className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500 border ${is_dark_mode ? 'border-zinc-950' : 'border-white'}`}
						/>
					)}
				</button>

				{alerts_dropdown({ is_alert_open, alerts, is_loading, is_dark_mode })}
			</div>

			<div
				className={`w-px h-6 mx-1 hidden sm:block ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
			/>

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
					user_email,
					navigate,
					sign_out,
					set_is_menu_open
				})}
			</div>
		</div>
	)
}

function use_header_search(user: { id: string } | null | undefined) {
	const [search_query, set_search_query] = useState('')
	const [dataset_results, set_dataset_results] = useState<DatasetSearchResult[]>([])
	const [search_project_results, set_search_project_results] = useState<ProjectSearchResult[]>([])
	const search_ref = useRef<HTMLDivElement>(undefined!)
	const search_query_ref = useRef('')

	useEffect(() => {
		if (!search_query.trim()) {
			set_dataset_results([])
			set_search_project_results([])
			search_query_ref.current = ''
			return
		}

		search_query_ref.current = search_query

		const timer = setTimeout(async () => {
			const query = search_query

			const { data: user_projects } = await supabase
				.from('projects')
				.select('id')
				.eq('user_id', user?.id)
			const project_ids = (user_projects ?? []).map((p) => p.id)

			if (query !== search_query_ref.current) return

			const [proj_result, ds_result] = await Promise.all([
				supabase
					.from('projects')
					.select('id, name')
					.eq('user_id', user?.id)
					.ilike('name', `%${query}%`)
					.limit(10),
				project_ids.length > 0
					? supabase
							.from('datasets')
							.select('id, name, project_id')
							.in('project_id', project_ids)
							.ilike('name', `%${query}%`)
							.limit(10)
					: Promise.resolve({ data: [] })
			])

			if (query !== search_query_ref.current) return

			if (proj_result.data) {
				set_search_project_results(proj_result.data as ProjectSearchResult[])
			}
			if (ds_result.data) {
				set_dataset_results(ds_result.data as DatasetSearchResult[])
			}
		}, 200)
		return () => clearTimeout(timer)
	}, [search_query, user?.id])

	return { search_query, set_search_query, dataset_results, search_project_results, search_ref }
}

function use_header_alerts(alerts: Alert[], user_email: string) {
	const [is_alert_open, set_alert_open] = useState(false)
	const [has_unviewed_alerts, set_has_unviewed_alerts] = useState(false)
	const alert_ref = useRef<HTMLDivElement>(undefined!)

	useEffect(() => {
		const current_key = alert_ids_key(alerts)
		const last_viewed = localStorage.getItem(`last_viewed_alert_ids_${user_email}`) ?? ''
		if (alerts.length > 0 && current_key !== last_viewed) {
			set_has_unviewed_alerts(true)
		} else if (alerts.length === 0) {
			set_has_unviewed_alerts(false)
		}
	}, [alerts, user_email])

	return { is_alert_open, set_alert_open, has_unviewed_alerts, set_has_unviewed_alerts, alert_ref }
}

function use_header_menu() {
	const [is_menu_open, set_is_menu_open] = useState(false)
	const [menu_el, set_menu_el] = useState<HTMLDivElement | undefined>(undefined)
	const menu_ref = useCallback((el: HTMLDivElement | null) => {
		set_menu_el(el ?? undefined)
	}, [])

	return { is_menu_open, set_is_menu_open, menu_el, menu_ref }
}

export function header_content() {
	const { is_dark_mode, toggle_theme, open_mobile_menu } = use_app_context()
	const { user, sign_out } = use_auth()
	const { alerts, is_loading } = use_alerts()
	const navigate = useNavigate()
	const location = useLocation()
	const user_email = user?.email ?? ''

	const path_parts = location.pathname.split('/').filter(Boolean)
	const project_id = path_parts[0] === 'projects' ? path_parts[1] : undefined
	const projects = use_project_store((s) => s.projects)
	const project = project_id ? projects.find((p) => p.id === project_id) : undefined
	const breadcrumbs = build_breadcrumbs(path_parts, project?.name, project_id)
	const is_home_page = location.pathname === '/home' || location.pathname === '/'

	const user_name = user?.user_metadata?.full_name as string | undefined
	const initials = user_name
		? user_name
				.split(' ')
				.map((s) => s[0])
				.join('')
				.toUpperCase()
				.slice(0, 2)
		: (user?.email?.[0]?.toUpperCase() ?? '?')

	const { search_query, set_search_query, dataset_results, search_project_results, search_ref } =
		use_header_search(user)
	const { is_alert_open, set_alert_open, has_unviewed_alerts, set_has_unviewed_alerts, alert_ref } =
		use_header_alerts(alerts, user_email)
	const { is_menu_open, set_is_menu_open, menu_el, menu_ref } = use_header_menu()

	useEffect(() => {
		function handle_click_outside(e: MouseEvent) {
			if (menu_el && !menu_el.contains(e.target as Node)) {
				set_is_menu_open(false)
			}
			if (search_ref.current && !search_ref.current.contains(e.target as Node) && search_query) {
				set_search_query('')
			}
			if (alert_ref.current && !alert_ref.current.contains(e.target as Node)) {
				set_alert_open(false)
			}
		}
		document.addEventListener('mousedown', handle_click_outside)
		return () => document.removeEventListener('mousedown', handle_click_outside)
	}, [
		menu_el,
		search_query,
		search_ref,
		alert_ref,
		set_is_menu_open,
		set_search_query,
		set_alert_open
	])

	const header_classes = is_dark_mode
		? 'bg-zinc-950/80 border-zinc-800'
		: 'bg-white/80 border-zinc-200'

	return (
		<header
			className={`flex h-16 shrink-0 items-center justify-between border-b px-4 lg:px-8 backdrop-blur-md z-10 box-border ${header_classes}`}
		>
			{left_section({ is_dark_mode, breadcrumbs, open_mobile_menu, navigate })}
			{right_actions({
				is_dark_mode,
				is_home_page,
				toggle_theme,
				search_query,
				set_search_query,
				search_ref,
				projects,
				search_project_results,
				dataset_results,
				navigate,
				is_alert_open,
				set_alert_open,
				alert_ref,
				has_unviewed_alerts,
				set_has_unviewed_alerts,
				menu_ref,
				is_menu_open,
				set_is_menu_open,
				sign_out,
				initials,
				user_name,
				user_email,
				alerts,
				is_loading
			})}
		</header>
	)
}
