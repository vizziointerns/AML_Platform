import React, { useState, useEffect } from 'react'
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
	ChevronDown,
	Sun,
	Moon,
	PanelLeftClose,
	PanelLeftOpen,
	User,
	ChevronRight,
	Layers
} from 'lucide-react'
import AuthFlow from './pages/AuthFlow'
import Dashboard from './pages/Dashboard'
import DatasetsView from './pages/DatasetsView'
import Uploader from './components/Uploader'
import AnnotationStudio from './pages/AnnotationStudio'
import WorkflowBuilder from './pages/WorkflowBuilder'
import ProjectsView from './pages/projects/ProjectsView'

// --- Types ---
export type Route =
	| 'dashboard'
	| 'datasets'
	| 'annotation'
	| 'models'
	| 'training'
	| 'deployments'
	| 'workflow'
	| 'settings'
	| 'projects'

interface NavItem {
	id: Route
	label: string
	icon: React.ElementType
}

// --- Navigation Configuration ---
const TOP_NAV_ITEMS: NavItem[] = [
	{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
	{ id: 'projects', label: 'Projects', icon: Layers },
	{ id: 'datasets', label: 'Datasets', icon: Database },
	{ id: 'annotation', label: 'Annotation', icon: PenTool }
]

const ML_NAV_ITEMS: NavItem[] = [
	{ id: 'models', label: 'Models', icon: Box },
	{ id: 'training', label: 'Training', icon: Cpu },
	{ id: 'deployments', label: 'Deployments', icon: Rocket },
	{ id: 'workflow', label: 'Workflow', icon: GitBranch }
]

const BOTTOM_NAV_ITEMS: NavItem[] = [{ id: 'settings', label: 'Team Settings', icon: Settings }]

// --- Custom Hooks ---

function use_keyboard_shortcuts(
	is_authenticated: boolean,
	set_is_sidebar_open: React.Dispatch<React.SetStateAction<boolean>>
) {
	useEffect(() => {
		if (!is_authenticated) return
		const handle_key_down = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
				e.preventDefault()
				set_is_sidebar_open((prev) => !prev)
			}
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault()
				console.info('Search triggered')
			}
		}

		window.addEventListener('keydown', handle_key_down)
		return () => window.removeEventListener('keydown', handle_key_down)
	}, [is_authenticated, set_is_sidebar_open])
}

function use_responsive_sidebar(
	is_authenticated: boolean,
	set_is_sidebar_open: React.Dispatch<React.SetStateAction<boolean>>
) {
	useEffect(() => {
		if (!is_authenticated) return
		const handle_resize = () => {
			if (window.innerWidth < 1024) {
				set_is_sidebar_open(false)
			} else {
				set_is_sidebar_open(true)
			}
		}

		window.addEventListener('resize', handle_resize)
		handle_resize()
		return () => window.removeEventListener('resize', handle_resize)
	}, [is_authenticated, set_is_sidebar_open])
}

// --- Helpers ---

function get_active_label(active_route: Route): string {
	const all_items = [...TOP_NAV_ITEMS, ...ML_NAV_ITEMS, ...BOTTOM_NAV_ITEMS]
	return all_items.find((item) => item.id === active_route)?.label || 'Dashboard'
}

// --- Sub-components ---

function nav_group({
	title,
	items,
	active_route,
	is_sidebar_open,
	on_navigate
}: {
	title?: string
	items: NavItem[]
	active_route: Route
	is_sidebar_open: boolean
	on_navigate: (route: Route) => void
}) {
	return (
		<div className="mb-6">
			{title && is_sidebar_open && (
				<div className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-opacity duration-200">
					{title}
				</div>
			)}
			<ul className="space-y-1 px-2">
				{items.map((item) => {
					const is_active = active_route === item.id
					return (
						<li key={item.id}>
							<button
								onClick={() => on_navigate(item.id)}
								className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
									is_active
										? 'bg-blue-600 text-white shadow-sm'
										: 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
								} ${!is_sidebar_open && 'justify-center px-0'}`}
								title={!is_sidebar_open ? item.label : undefined}
							>
								<item.icon size={18} className={is_active ? 'text-white' : 'text-zinc-400'} />
								{is_sidebar_open && <span>{item.label}</span>}
							</button>
						</li>
					)
				})}
			</ul>
		</div>
	)
}

function sidebar_content({
	is_sidebar_open,
	is_dark_mode,
	is_mobile_menu_open,
	active_route,
	on_navigate,
	on_toggle_collapse
}: {
	is_sidebar_open: boolean
	is_dark_mode: boolean
	is_mobile_menu_open: boolean
	active_route: Route
	on_navigate: (route: Route) => void
	on_toggle_collapse: () => void
}) {
	const sidebar_classes = is_dark_mode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'

	return (
		<aside
			className={`fixed lg:static top-0 left-0 z-50 h-full shrink-0 flex flex-col border-r transition-all duration-300 ease-in-out ${sidebar_classes} ${
				is_sidebar_open ? 'w-64 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0'
			} ${is_mobile_menu_open ? 'translate-x-0' : ''}`}
		>
			<div
				className={`h-16 flex items-center border-b ${is_dark_mode ? 'border-zinc-800/60' : 'border-zinc-200'} shrink-0 ${is_sidebar_open ? 'px-4' : 'px-0 justify-center'}`}
			>
				<button
					className={`w-full flex items-center justify-between rounded-md hover:bg-zinc-800/50 transition-colors ${is_sidebar_open ? 'px-2 py-1.5' : 'p-2 justify-center'}`}
				>
					<div className="flex items-center gap-3">
						<div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
							<Box size={16} className="text-white" />
						</div>
						{is_sidebar_open && (
							<div className="flex flex-col items-start overflow-hidden">
								<span className="text-sm font-semibold truncate w-32 text-left">Acme Corp</span>
								<span className="text-[10px] text-zinc-500 truncate w-32 text-left">
									Production Workspace
								</span>
							</div>
						)}
					</div>
					{is_sidebar_open && <ChevronDown size={14} className="text-zinc-500" />}
				</button>
			</div>

			<nav className="flex-1 overflow-y-auto py-6 hide-scrollbar">
				{nav_group({ items: TOP_NAV_ITEMS, active_route, is_sidebar_open, on_navigate })}
				{nav_group({
					title: 'Machine Learning',
					items: ML_NAV_ITEMS,
					active_route,
					is_sidebar_open,
					on_navigate
				})}
				{nav_group({
					title: 'Configuration',
					items: BOTTOM_NAV_ITEMS,
					active_route,
					is_sidebar_open,
					on_navigate
				})}
			</nav>

			<div
				className={`p-4 border-t ${is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'} shrink-0 flex flex-col gap-2`}
			>
				<button
					onClick={on_toggle_collapse}
					className={`hidden lg:flex items-center gap-2 p-2 rounded-md hover:bg-zinc-800/50 transition-colors text-zinc-400 hover:text-zinc-100 ${!is_sidebar_open && 'justify-center'}`}
					title="Toggle Sidebar (Cmd+B)"
				>
					{is_sidebar_open ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
					{is_sidebar_open && <span className="text-sm font-medium">Collapse Sidebar</span>}
				</button>
			</div>
		</aside>
	)
}

function header_content({
	is_dark_mode,
	active_route,
	on_toggle_theme,
	on_signout,
	on_open_mobile_menu
}: {
	is_dark_mode: boolean
	active_route: Route
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
					<span className="text-zinc-500">Workspace</span>
					<ChevronRight size={14} className="text-zinc-600" />
					<span className={`${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'} font-medium`}>
						{get_active_label(active_route)}
					</span>
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

function app_content({
	active_route,
	is_dark_mode,
	on_open_uploader
}: {
	active_route: Route
	is_dark_mode: boolean
	on_open_uploader: () => void
}) {
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_muted_secondary = is_dark_mode ? 'text-zinc-500' : 'text-zinc-400'
	const text_icon = is_dark_mode ? 'text-zinc-800' : 'text-zinc-300'
	const bg_skeleton = is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'
	const bg_skeleton_light = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	const bg_dot = is_dark_mode ? 'bg-zinc-700' : 'bg-zinc-200'
	const skeleton_bar = (w: string) => <div className={`h-3 rounded ${bg_dot} ${w}`} />
	const skeleton_line = (w: string) => <div className={`h-2 rounded ${bg_dot} ${w}`} />

	if (active_route === 'workflow') {
		return (
			<div className="flex-1 overflow-hidden relative">
				<WorkflowBuilder is_dark_mode={is_dark_mode} />
			</div>
		)
	}

	if (active_route === 'projects') {
		return (
			<div className="flex-1 overflow-y-auto">
				<ProjectsView is_dark_mode={is_dark_mode} />
			</div>
		)
	}

	if (active_route === 'dashboard') {
		return (
			<div className="flex-1 overflow-y-auto p-4 lg:p-8">
				<div className="max-w-7xl mx-auto space-y-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
						<div>
							<h1 className="text-2xl font-semibold tracking-tight">
								{get_active_label(active_route)}
							</h1>
							<p className={`text-sm mt-1 ${text_muted}`}>
								Manage your {get_active_label(active_route).toLowerCase()} and configure workspace
								settings.
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
					<Dashboard isDarkMode={is_dark_mode} />
				</div>
			</div>
		)
	}

	if (active_route === 'datasets') {
		return (
			<div className="flex-1 overflow-y-auto p-4 lg:p-8">
				<div className="max-w-7xl mx-auto space-y-6">
					<DatasetsView isDarkMode={is_dark_mode} onUpload={on_open_uploader} />
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 overflow-y-auto p-4 lg:p-8">
			<div className="max-w-7xl mx-auto space-y-6">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							{get_active_label(active_route)}
						</h1>
						<p className={`text-sm mt-1 ${text_muted}`}>
							Manage your {get_active_label(active_route).toLowerCase()} and configure workspace
							settings.
						</p>
					</div>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div
						className={`col-span-1 md:col-span-2 rounded-xl border p-6 min-h-[300px] flex items-center justify-center flex-col gap-4 ${card_classes}`}
					>
						{React.createElement(
							[...TOP_NAV_ITEMS, ...ML_NAV_ITEMS, ...BOTTOM_NAV_ITEMS].find(
								(i) => i.id === active_route
							)?.icon || LayoutDashboard,
							{ size: 48, className: text_icon }
						)}
						<p className={`text-sm ${text_muted_secondary}`}>
							Primary content area for {get_active_label(active_route)}
						</p>
					</div>

					<div className="col-span-1 space-y-6">
						<div
							className={`rounded-xl border p-6 min-h-[140px] flex flex-col justify-between ${card_classes}`}
						>
							<div className="text-sm font-medium">Quick Actions</div>
							<div className="space-y-2 mt-4">
								<div className={`h-8 rounded ${bg_skeleton} w-full animate-pulse`}></div>
								<div className={`h-8 rounded ${bg_skeleton} w-2/3 animate-pulse`}></div>
							</div>
						</div>
						<div
							className={`rounded-xl border p-6 min-h-[136px] flex flex-col justify-between ${card_classes}`}
						>
							<div className="text-sm font-medium">Recent Activity</div>
							<div className="space-y-2 mt-4">
								<div className={`h-4 rounded ${bg_skeleton} w-full animate-pulse`}></div>
								<div className={`h-4 rounded ${bg_skeleton} w-4/5 animate-pulse`}></div>
								<div className={`h-4 rounded ${bg_skeleton} w-3/4 animate-pulse`}></div>
							</div>
						</div>
					</div>
				</div>
				<div className={`mt-6 w-full rounded-xl border p-6 min-h-[400px] ${card_classes}`}>
					<div className={`h-6 rounded ${bg_skeleton} w-48 mb-6`}></div>
					<div className="space-y-4">
						{[1, 2, 3, 4].map((i) => (
							<div
								key={i}
								className={`h-16 rounded-lg ${bg_skeleton_light} w-full flex items-center px-4 gap-4`}
							>
								<div className={`h-8 w-8 rounded-full ${bg_dot}`}></div>
								<div className="space-y-2 flex-1">
									{skeleton_bar('w-1/4')}
									{skeleton_line('w-1/3')}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}

// --- Main Component ---

export default function app() {
	const [is_authenticated, set_is_authenticated] = useState(false)
	const [active_route, set_active_route] = useState<Route>('dashboard')
	const [is_sidebar_open, set_is_sidebar_open] = useState(true)
	const [is_dark_mode, set_is_dark_mode] = useState(true)
	const [is_mobile_menu_open, set_is_mobile_menu_open] = useState(false)
	const [is_uploader_open, set_is_uploader_open] = useState(false)

	use_keyboard_shortcuts(is_authenticated, set_is_sidebar_open)
	use_responsive_sidebar(is_authenticated, set_is_sidebar_open)

	if (!is_authenticated) {
		return <AuthFlow on_complete={() => set_is_authenticated(true)} />
	}

	function on_navigate(route: Route) {
		set_active_route(route)
		if (window.innerWidth < 1024) {
			set_is_mobile_menu_open(false)
		}
	}

	const theme_classes = is_dark_mode
		? 'bg-[#09090b] text-zinc-200 selection:bg-blue-500/30'
		: 'bg-zinc-50 text-zinc-900 selection:bg-blue-500/30'

	return (
		<div className={`flex h-screen w-full overflow-hidden font-sans ${theme_classes}`}>
			{is_mobile_menu_open && (
				<div
					className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
					onClick={() => set_is_mobile_menu_open(false)}
				/>
			)}

			{sidebar_content({
				is_sidebar_open,
				is_dark_mode,
				is_mobile_menu_open,
				active_route,
				on_navigate,
				on_toggle_collapse: () => set_is_sidebar_open((prev) => !prev)
			})}

			<main className="flex flex-1 flex-col overflow-hidden relative w-full translate-x-0 transition-transform">
				{active_route === 'annotation' ? (
					<AnnotationStudio isDarkMode={is_dark_mode} />
				) : (
					<>
						{header_content({
							is_dark_mode,
							active_route,
							on_toggle_theme: () => set_is_dark_mode((prev) => !prev),
							on_signout: () => set_is_authenticated(false),
							on_open_mobile_menu: () => set_is_mobile_menu_open(true)
						})}
						{app_content({
							active_route,
							is_dark_mode,
							on_open_uploader: () => set_is_uploader_open(true)
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
