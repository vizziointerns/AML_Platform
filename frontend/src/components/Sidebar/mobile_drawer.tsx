import { useLocation, useNavigate } from 'react-router-dom'
import { Box, X } from 'lucide-react'
import { use_app_context } from '../../contexts/app_context'
import { APP_NAV_ITEMS, APP_BOTTOM_ITEMS } from '../../config/navigation'
import { nav_section } from './shared'

export function mobile_drawer() {
	const { is_dark_mode, is_mobile_menu_open, close_mobile_menu } = use_app_context()
	const navigate = useNavigate()
	const location = useLocation()
	const current_route = location.pathname.split('/')[1] ?? 'home'

	if (!is_mobile_menu_open) return undefined

	const sidebar_cls = is_dark_mode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'

	return (
		<>
			<div
				className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 lg:hidden"
				onClick={close_mobile_menu}
			/>
			<aside
				className={`fixed top-0 left-0 z-50 h-full w-64 shrink-0 flex flex-col border-r shadow-2xl animate-in slide-in-from-left duration-300 lg:hidden ${sidebar_cls}`}
			>
				<div
					className={`h-16 flex items-center justify-between border-b px-4 shrink-0 ${is_dark_mode ? 'border-zinc-800/60' : 'border-zinc-200'}`}
				>
					<div className="flex items-center gap-3">
						<div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
							<Box size={16} className="text-white" />
						</div>
						<div className="flex flex-col">
							<span
								className={`text-sm font-semibold text-left ${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'}`}
							>
								AML Platform
							</span>
							<span className="text-[10px] text-zinc-500 text-left">Production Workspace</span>
						</div>
					</div>
					<button
						onClick={close_mobile_menu}
						className={`p-2 rounded-md ${is_dark_mode ? 'hover:bg-zinc-800/50 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
					>
						<X size={18} />
					</button>
				</div>

				<nav className="flex-1 overflow-y-auto py-6 hide-scrollbar">
					<div className="mb-6">
						{nav_section({
							items: APP_NAV_ITEMS,
							current_id: current_route,
							is_expanded: true,
							on_click: (id) => {
								close_mobile_menu()
								navigate(`/${id}`)
							}
						})}
					</div>
					<div className="mb-6">
						<div className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
							Configuration
						</div>
						{nav_section({
							items: APP_BOTTOM_ITEMS,
							current_id: current_route,
							is_expanded: true,
							on_click: (id) => {
								close_mobile_menu()
								navigate(`/${id}`)
							}
						})}
					</div>
				</nav>
			</aside>
		</>
	)
}
