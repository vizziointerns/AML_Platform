import { useLocation } from 'react-router-dom'
import { Box } from 'lucide-react'
import { APP_NAV_ITEMS, APP_BOTTOM_ITEMS } from '../../config/navigation'
import { nav_section } from './shared'

export function app_sidebar({
	is_expanded,
	is_hover_expanded,
	is_hovered,
	is_dark_mode,
	on_navigate,
	on_logo_click
}: {
	is_expanded: boolean
	is_hover_expanded: boolean
	is_hovered?: boolean
	is_dark_mode: boolean
	on_navigate: (route: string) => void
	on_logo_click: () => void
}) {
	const location = useLocation()
	const current_route = location.pathname.split('/')[1] ?? 'home'

	const is_now_expanded = is_expanded || is_hover_expanded
	const width_expanded = is_now_expanded ? 'w-64' : 'w-16'
	const sidebar_classes = is_dark_mode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
	const border_color = is_dark_mode ? 'border-zinc-800/60' : 'border-zinc-200'
	const expanded_pad = is_now_expanded ? 'px-4' : 'px-0 justify-center'
	const logo_pad = is_now_expanded ? 'px-2 py-1.5' : 'p-2 justify-center'
	const aside_shadow = is_hovered && !is_expanded ? 'shadow-2xl shadow-black/50' : ''

	return (
		<aside
			className={`hidden lg:flex fixed lg:static top-0 left-0 z-50 h-full shrink-0 flex-col border-r transition-all duration-300 ease-in-out ${sidebar_classes} ${width_expanded} ${aside_shadow}`}
		>
			<div className={`h-16 flex items-center border-b ${border_color} shrink-0 ${expanded_pad}`}>
				<button
					onClick={on_logo_click}
					className={`w-full flex items-center gap-3 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors ${logo_pad}`}
				>
					<div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
						<Box size={16} className="text-white" />
					</div>
					{is_now_expanded && (
						<div className="flex flex-col items-start overflow-hidden">
							<span
								className={`text-sm font-semibold truncate w-32 text-left ${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'}`}
							>
								AML Platform
							</span>
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
						current_id: current_route,
						is_expanded: is_now_expanded,
						on_click: (id) => on_navigate(id)
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
						current_id: current_route,
						is_expanded: is_now_expanded,
						on_click: (id) => on_navigate(id)
					})}
				</div>
			</nav>
		</aside>
	)
}
