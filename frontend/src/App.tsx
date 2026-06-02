import { useState, useEffect } from 'react'
import {
	LayoutDashboard,
	Database,
	PenTool,
	Box,
	Cpu,
	Rocket,
	GitBranch,
	Settings,
	Menu,
	Bell,
	Search,
	Sun,
	Moon,
	PanelLeftClose,
	PanelLeftOpen,
	User,
	ChevronRight,
	Layers,
	Home,
	ChevronLeft
} from 'lucide-react'
import AuthFlow from './pages/AuthFlow'

import HomePage from './pages/Home'
import DatasetsView from './pages/DatasetsView'
import Uploader from './components/Uploader'
import AnnotationStudio from './pages/AnnotationStudio'
import WorkflowBuilder from './pages/WorkflowBuilder'
import ProjectsView from './pages/projects/ProjectsView'
import { use_navigation_store, type AppRoute, type ProjectRoute } from './store/navigationStore'
import { use_project_store } from './store/projectStore'

// --- Level 1 navigation config (app-level) ---
interface AppNavItem {
	id: AppRoute
	label: string
	icon: React.ElementType
}

const APP_NAV_ITEMS: AppNavItem[] = [
	{ id: 'home', label: 'Home', icon: Home },
	{ id: 'projects', label: 'Projects', icon: Layers }
]

const APP_BOTTOM_ITEMS: AppNavItem[] = [{ id: 'settings', label: 'Settings', icon: Settings }]

// --- Level 2 navigation config (project-level) ---
interface ProjectNavItem {
	id: ProjectRoute
	label: string
	icon: React.ElementType
}

const PROJECT_NAV_ITEMS: ProjectNavItem[] = [
	{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
	{ id: 'datasets', label: 'Datasets', icon: Database },
	{ id: 'annotation', label: 'Annotation', icon: PenTool }
]

const PROJECT_ML_ITEMS: ProjectNavItem[] = [
	{ id: 'models', label: 'Models', icon: Box },
	{ id: 'training', label: 'Training', icon: Cpu },
	{ id: 'deployment', label: 'Deployment', icon: Rocket },
	{ id: 'workflow', label: 'Workflow', icon: GitBranch }
]

// --- Custom Hooks ---

function use_keyboard_shortcuts(is_authenticated: boolean, on_toggle: () => void) {
	useEffect(() => {
		if (!is_authenticated) return
		const handle_key_down = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
				e.preventDefault()
				on_toggle()
			}
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault()
				console.info('Search triggered')
			}
		}
		window.addEventListener('keydown', handle_key_down)
		return () => window.removeEventListener('keydown', handle_key_down)
	}, [is_authenticated, on_toggle])
}

// --- Sidebar Components ---

function nav_button({
	icon: Icon,
	label,
	is_active,
	is_expanded,
	on_click
}: {
	icon: React.ElementType
	label: string
	is_active: boolean
	is_expanded: boolean
	on_click: () => void
}) {
	return (
		<button
			onClick={on_click}
			className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
				is_active
					? 'bg-blue-600 text-white shadow-sm'
					: 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
			} ${!is_expanded && 'justify-center px-0'}`}
			title={!is_expanded ? label : undefined}
		>
			<Icon size={18} className={is_active ? 'text-white' : 'text-zinc-400'} />
			{is_expanded && <span>{label}</span>}
		</button>
	)
}

function nav_section({
	items,
	current_id,
	is_expanded,
	on_click
}: {
	items: { id: string; label: string; icon: React.ElementType }[]
	current_id: string | null
	is_expanded: boolean
	on_click: (id: string) => void
}) {
	return (
		<ul className="space-y-1 px-2">
			{items.map((item) => (
				<li key={item.id}>
					{nav_button({
						icon: item.icon,
						label: item.label,
						is_active: current_id === item.id,
						is_expanded,
						on_click: () => on_click(item.id)
					})}
				</li>
			))}
		</ul>
	)
}

function level1_sidebar({
	is_expanded,
	is_hover_expanded,
	is_dark_mode,
	is_mobile_open,
	app_route,
	on_navigate,
	on_toggle,
	on_leave_project,
	on_logo_click
}: {
	is_expanded: boolean
	is_hover_expanded: boolean
	is_dark_mode: boolean
	is_mobile_open: boolean
	app_route: AppRoute
	on_navigate: (route: AppRoute) => void
	on_toggle: () => void
	on_leave_project: () => void
	on_logo_click: () => void
}) {
	const is_now_expanded = is_expanded || is_hover_expanded
	const sidebar_classes = is_dark_mode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
	const width_expanded = is_now_expanded ? 'w-64' : 'w-16'

	return (
		<aside
			className={`fixed lg:static top-0 left-0 z-50 h-full shrink-0 flex flex-col border-r transition-all duration-300 ease-in-out ${sidebar_classes} ${width_expanded} ${
				is_mobile_open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
			}`}
		>
			<div
				className={`h-16 flex items-center border-b ${is_dark_mode ? 'border-zinc-800/60' : 'border-zinc-200'} shrink-0 ${is_now_expanded ? 'px-4' : 'px-0 justify-center'}`}
			>
				<button
					onClick={on_logo_click}
					className={`w-full flex items-center gap-3 rounded-md hover:bg-zinc-800/50 transition-colors ${is_now_expanded ? 'px-2 py-1.5' : 'p-2 justify-center'}`}
				>
					<div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
						<Box size={16} className="text-white" />
					</div>
					{is_now_expanded && (
						<div className="flex flex-col items-start overflow-hidden">
							<span className="text-sm font-semibold truncate w-32 text-left">Acme Corp</span>
							<span className="text-[10px] text-zinc-500 truncate w-32 text-left">
								Production Workspace
							</span>
						</div>
					)}
				</button>
			</div>

			<nav className="flex-1 overflow-y-auto py-6 hide-scrollbar">
				<div className="mb-6">
					{nav_section({
						items: APP_NAV_ITEMS,
						current_id: app_route,
						is_expanded: is_now_expanded,
						on_click: (id) => {
							on_leave_project()
							on_navigate(id as AppRoute)
						}
					})}
				</div>
				<div className="mb-6">
					{is_now_expanded && (
						<div className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
							Configuration
						</div>
					)}
					{nav_section({
						items: APP_BOTTOM_ITEMS,
						current_id: app_route,
						is_expanded: is_now_expanded,
						on_click: (id) => {
							on_leave_project()
							on_navigate(id as AppRoute)
						}
					})}
				</div>
			</nav>

			<div
				className={`p-4 border-t ${is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'} shrink-0 flex flex-col gap-2`}
			>
				<button
					onClick={on_toggle}
					className={`hidden lg:flex items-center gap-2 p-2 rounded-md hover:bg-zinc-800/50 transition-colors text-zinc-400 hover:text-zinc-100 ${!is_now_expanded && 'justify-center'}`}
					title="Toggle Sidebar (Cmd+B)"
				>
					{is_now_expanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
					{is_now_expanded && <span className="text-sm font-medium">Collapse Sidebar</span>}
				</button>
			</div>
		</aside>
	)
}

function level2_sidebar({
	is_dark_mode,
	project_route,
	project_name,
	on_navigate,
	on_back
}: {
	is_dark_mode: boolean
	project_route: ProjectRoute
	project_name: string
	on_navigate: (route: ProjectRoute) => void
	on_back: () => void
}) {
	const sidebar_classes = is_dark_mode
		? 'bg-zinc-900/80 border-zinc-800'
		: 'bg-zinc-50/80 border-zinc-200'

	return (
		<aside className={`hidden lg:flex w-64 h-full shrink-0 flex-col border-r ${sidebar_classes}`}>
			<div
				className={`h-16 flex items-center border-b ${is_dark_mode ? 'border-zinc-800/60' : 'border-zinc-200'} shrink-0 px-4 gap-3`}
			>
				<button
					onClick={on_back}
					className="p-1 rounded-md hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-100 transition-colors"
					title="Back to projects"
				>
					<ChevronLeft size={16} />
				</button>
				<div className="flex flex-col items-start overflow-hidden min-w-0">
					<span
						className={`text-sm font-semibold truncate w-36 text-left ${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'}`}
					>
						{project_name}
					</span>
					<span className="text-[10px] text-zinc-500 truncate w-36 text-left">
						Project Workspace
					</span>
				</div>
			</div>

			<nav className="flex-1 overflow-y-auto py-4 hide-scrollbar">
				<div className="mb-4">
					{nav_section({
						items: PROJECT_NAV_ITEMS,
						current_id: project_route,
						is_expanded: true,
						on_click: (id) => on_navigate(id as ProjectRoute)
					})}
				</div>
				<div>
					<div
						className={`px-4 mb-2 text-[10px] font-bold uppercase tracking-widest ${is_dark_mode ? 'text-zinc-500' : 'text-zinc-400'}`}
					>
						Machine Learning
					</div>
					{nav_section({
						items: PROJECT_ML_ITEMS,
						current_id: project_route,
						is_expanded: true,
						on_click: (id) => on_navigate(id as ProjectRoute)
					})}
				</div>
			</nav>
		</aside>
	)
}

// --- Header ---

function header_content({
	is_dark_mode,
	breadcrumbs,
	on_toggle_theme,
	on_signout,
	on_open_mobile_menu
}: {
	is_dark_mode: boolean
	breadcrumbs: { label: string }[]
	on_toggle_theme: () => void
	on_signout: () => void
	on_open_mobile_menu: () => void
}) {
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
					onClick={on_open_mobile_menu}
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

				<button className="sm:hidden p-2 rounded-full hover:bg-zinc-800/50 text-zinc-400">
					<Search size={18} />
				</button>

				<button
					onClick={on_toggle_theme}
					className="p-2 rounded-full hover:bg-zinc-800/50 text-zinc-400 transition-colors"
					title="Toggle Theme"
				>
					{is_dark_mode ? <Sun size={18} /> : <Moon size={18} />}
				</button>

				<button className="p-2 rounded-full hover:bg-zinc-800/50 text-zinc-400 relative transition-colors">
					<Bell size={18} />
					<span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500 border border-zinc-950"></span>
				</button>

				<div className="w-px h-6 bg-zinc-800 mx-1 hidden sm:block"></div>

				<button
					onClick={on_signout}
					className="flex items-center gap-2 hover:opacity-80 transition-opacity"
					title="Sign out for testing"
				>
					<div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white border-2 border-zinc-950 shadow-sm">
						<User size={14} />
					</div>
				</button>
			</div>
		</header>
	)
}

// --- Page Content ---

function page_placeholder({
	label,
	is_dark_mode,
	text_muted
}: {
	label: string
	is_dark_mode: boolean
	text_muted: string
}) {
	return (
		<div className="flex-1 overflow-y-auto p-4 lg:p-8">
			<div className="max-w-7xl mx-auto space-y-6">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
					<p className={`text-sm mt-1 ${text_muted}`}>{label} overview and management.</p>
				</div>
				<div
					className={`rounded-xl border p-12 flex items-center justify-center ${is_dark_mode ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}`}
				>
					<p className={text_muted}>{label} page — coming soon.</p>
				</div>
			</div>
		</div>
	)
}

function page_project_dashboard({
	project,
	is_dark_mode,
	text_muted,
	on_open_uploader
}: {
	project: {
		name: string
		datasetCount: number
		annotationProgress: number
		type: string
		members: string[]
	}
	is_dark_mode: boolean
	text_muted: string
	on_open_uploader: () => void
}) {
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'

	return (
		<div className="flex-1 overflow-y-auto p-4 lg:p-8">
			<div className="max-w-7xl mx-auto space-y-6">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
						<p className={`text-sm mt-1 ${text_muted}`}>
							{project.name} — project overview and statistics.
						</p>
					</div>
					<div className="flex gap-2">
						<button
							onClick={on_open_uploader}
							className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm transition-colors"
						>
							Upload Data
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<div className={`p-5 rounded-xl border flex flex-col ${card_classes}`}>
						<div className={`text-sm font-medium ${text_muted} mb-3`}>Images</div>
						<div className="text-2xl font-bold tracking-tight">
							{project.datasetCount.toLocaleString()}
						</div>
					</div>
					<div className={`p-5 rounded-xl border flex flex-col ${card_classes}`}>
						<div className={`text-sm font-medium ${text_muted} mb-3`}>Annotation Progress</div>
						<div className="text-2xl font-bold tracking-tight">{project.annotationProgress}%</div>
						<div
							className={`mt-2 h-1.5 rounded-full overflow-hidden ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
						>
							<div
								className="h-full bg-blue-500 rounded-full"
								style={{ width: `${project.annotationProgress}%` }}
							/>
						</div>
					</div>
					<div className={`p-5 rounded-xl border flex flex-col ${card_classes}`}>
						<div className={`text-sm font-medium ${text_muted} mb-3`}>Type</div>
						<div className="text-lg font-bold tracking-tight">{project.type}</div>
					</div>
					<div className={`p-5 rounded-xl border flex flex-col ${card_classes}`}>
						<div className={`text-sm font-medium ${text_muted} mb-3`}>Members</div>
						<div className="text-2xl font-bold tracking-tight">{project.members.length}</div>
					</div>
				</div>

				<div className={`rounded-xl border ${card_classes} p-5`}>
					<h3 className="font-semibold text-base tracking-tight mb-4">Quick Actions</h3>
					<div className="flex flex-wrap gap-3">
						<button
							onClick={on_open_uploader}
							className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
						>
							Upload Data
						</button>
						<button
							className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${is_dark_mode ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
						>
							Start Annotation
						</button>
						<button
							className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${is_dark_mode ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
						>
							Export Dataset
						</button>
					</div>
				</div>

				<div className={`rounded-xl border ${card_classes} p-5`}>
					<h3 className="font-semibold text-base tracking-tight mb-4">Team Members</h3>
					<div className="flex flex-wrap gap-2">
						{project.members.map((member, i) => (
							<div
								key={i}
								className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${bg_subtle} ${is_dark_mode ? 'text-zinc-300' : 'text-zinc-700'}`}
							>
								<div
									className={`w-6 h-6 rounded-full text-[10px] font-medium flex items-center justify-center ${is_dark_mode ? 'bg-zinc-700' : 'bg-zinc-300'}`}
								>
									{member[0]}
								</div>
								{member}
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}

function page_app_home({
	is_dark_mode,
	on_open_uploader
}: {
	is_dark_mode: boolean
	on_open_uploader: () => void
}) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'

	return (
		<div className="flex-1 overflow-y-auto p-4 lg:p-8">
			<div className="max-w-7xl mx-auto space-y-6">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">Home</h1>
						<p className={`text-sm mt-1 ${text_muted}`}>
							Welcome to your workspace. Overview of all projects.
						</p>
					</div>
					<div className="flex gap-2">
						<button
							onClick={on_open_uploader}
							className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm transition-colors"
						>
							Upload Data
						</button>
					</div>
				</div>
				<HomePage is_dark_mode={is_dark_mode} />
			</div>
		</div>
	)
}

function page_content({
	app_route,
	project_route,
	is_in_project,
	is_dark_mode,
	on_open_uploader,
	active_project
}: {
	app_route: AppRoute
	project_route: ProjectRoute
	is_in_project: boolean
	is_dark_mode: boolean
	on_open_uploader: () => void
	active_project:
		| {
				name: string
				datasetCount: number
				annotationProgress: number
				type: string
				members: string[]
		  }
		| undefined
}) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'

	if (is_in_project) {
		if (project_route === 'workflow') {
			return (
				<div className="flex-1 overflow-hidden relative">
					<WorkflowBuilder is_dark_mode={is_dark_mode} />
				</div>
			)
		}
		if (project_route === 'annotation') {
			return <AnnotationStudio isDarkMode={is_dark_mode} />
		}
		if (project_route === 'datasets') {
			return (
				<div className="flex-1 overflow-y-auto p-4 lg:p-8">
					<div className="max-w-7xl mx-auto">
						<DatasetsView isDarkMode={is_dark_mode} onUpload={on_open_uploader} />
					</div>
				</div>
			)
		}
		if (project_route === 'dashboard') {
			return page_project_dashboard({
				project: active_project!,
				is_dark_mode,
				text_muted,
				on_open_uploader
			})
		}
		return page_placeholder({
			label: project_route.charAt(0).toUpperCase() + project_route.slice(1),
			is_dark_mode,
			text_muted
		})
	}

	if (app_route === 'projects') {
		return (
			<div className="flex-1 overflow-y-auto">
				<ProjectsView is_dark_mode={is_dark_mode} />
			</div>
		)
	}

	if (app_route === 'home') {
		return page_app_home({ is_dark_mode, on_open_uploader })
	}

	return page_placeholder({
		label: 'Settings',
		is_dark_mode,
		text_muted
	})
}

// --- Main Component ---

export default function app() {
	const [is_authenticated, set_is_authenticated] = useState(false)
	const [is_dark_mode, set_is_dark_mode] = useState(true)
	const [is_mobile_menu_open, set_is_mobile_menu_open] = useState(false)
	const [is_uploader_open, set_is_uploader_open] = useState(false)
	const [is_l1_hovered, set_is_l1_hovered] = useState(false)

	const {
		appRoute: app_route,
		projectRoute: project_route,
		activeProjectId: active_project_id,
		setAppRoute: set_app_route,
		setProjectRoute: set_project_route,
		leaveProject: leave_project
	} = use_navigation_store()

	const projects = use_project_store((s) => s.projects)
	const active_project = projects.find((p) => p.id === active_project_id)
	const is_in_project = active_project_id !== undefined

	const [is_l1_expanded, set_is_l1_expanded] = useState(true)

	use_keyboard_shortcuts(is_authenticated, () => set_is_l1_expanded((prev) => !prev))

	useEffect(() => {
		if (!is_authenticated) return
		if (window.innerWidth < 1024) {
			set_is_l1_expanded(false)
		} else {
			set_is_l1_expanded(!is_in_project)
		}
	}, [is_authenticated, is_in_project])

	if (!is_authenticated) {
		return <AuthFlow on_complete={() => set_is_authenticated(true)} />
	}

	const theme_classes = is_dark_mode
		? 'bg-[#09090b] text-zinc-200 selection:bg-blue-500/30'
		: 'bg-zinc-50 text-zinc-900 selection:bg-blue-500/30'

	const breadcrumbs = is_in_project
		? [
				{ label: 'Workspace' },
				{ label: active_project?.name ?? 'Project' },
				{ label: project_route.charAt(0).toUpperCase() + project_route.slice(1) }
			]
		: [{ label: 'Workspace' }, { label: app_route.charAt(0).toUpperCase() + app_route.slice(1) }]

	return (
		<div className={`flex h-screen w-full overflow-hidden font-sans ${theme_classes}`}>
			{is_mobile_menu_open && (
				<div
					className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
					onClick={() => set_is_mobile_menu_open(false)}
				/>
			)}

			<div
				onMouseEnter={() => set_is_l1_hovered(true)}
				onMouseLeave={() => set_is_l1_hovered(false)}
			>
				{level1_sidebar({
					is_expanded: is_l1_expanded,
					is_hover_expanded: is_in_project && is_l1_hovered && !is_l1_expanded,
					is_dark_mode,
					is_mobile_open: is_mobile_menu_open,
					app_route,
					on_navigate: set_app_route,
					on_toggle: () => set_is_l1_expanded((prev) => !prev),
					on_leave_project: leave_project,
					on_logo_click: () => {
						leave_project()
						set_app_route('home')
					}
				})}
			</div>

			<div
				className="hidden lg:flex h-full overflow-hidden transition-all duration-300 ease-in-out shrink-0"
				style={{ width: is_in_project ? '16rem' : '0px' }}
			>
				{level2_sidebar({
					is_dark_mode,
					project_route,
					project_name: active_project?.name ?? 'Project',
					on_navigate: set_project_route,
					on_back: () => {
						leave_project()
						set_app_route('projects')
					}
				})}
			</div>

			<main className="flex flex-1 flex-col overflow-hidden relative w-full min-w-0">
				{is_in_project && project_route === 'annotation' ? (
					<AnnotationStudio isDarkMode={is_dark_mode} />
				) : (
					<>
						{header_content({
							is_dark_mode,
							breadcrumbs,
							on_toggle_theme: () => set_is_dark_mode((prev) => !prev),
							on_signout: () => set_is_authenticated(false),
							on_open_mobile_menu: () => set_is_mobile_menu_open(true)
						})}
						{page_content({
							app_route,
							project_route,
							is_in_project,
							is_dark_mode,
							on_open_uploader: () => set_is_uploader_open(true),
							active_project
						})}
					</>
				)}
			</main>

			<Uploader
				isOpen={is_uploader_open}
				on_close={() => set_is_uploader_open(false)}
				is_dark_mode={is_dark_mode}
			/>

			<style
				dangerouslySetInnerHTML={{
					__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `
				}}
			/>
		</div>
	)
}
