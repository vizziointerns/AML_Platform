import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { use_project_store } from '../../store/projectStore'
import { use_app_context } from '../../contexts/app_context'
import { PROJECT_NAV_ITEMS, PROJECT_ML_ITEMS } from '../../config/navigation'
import { nav_section } from './shared'

export function project_sidebar() {
	const { is_dark_mode } = use_app_context()
	const params = useParams()
	const project_id = params.projectId
	const navigate = useNavigate()
	const location = useLocation()

	const projects = use_project_store((s) => s.projects)
	const project = projects.find((p) => p.id === project_id)

	const sub_route = location.pathname.split('/').filter(Boolean).pop() ?? 'dashboard'

	const sidebar_cls = is_dark_mode ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-200 bg-white'
	const border_cls = is_dark_mode ? 'border-zinc-800/60' : 'border-zinc-200'
	const btn_cls = is_dark_mode
		? 'hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-100'
		: 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'

	return (
		<aside className={`hidden lg:flex w-64 h-full shrink-0 flex-col border-r ${sidebar_cls}`}>
			<div className={`h-16 flex items-center border-b ${border_cls} shrink-0 px-4 gap-3`}>
				<button
					onClick={() => navigate('/projects')}
					className={`p-1 rounded-md transition-colors ${btn_cls}`}
					title="Back to projects"
				>
					<ChevronLeft size={16} />
				</button>
				<div className="flex flex-col items-start overflow-hidden min-w-0">
					<span
						className={`text-sm font-semibold truncate w-36 text-left ${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'}`}
					>
						{project?.name ?? 'Project'}
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
						current_id: sub_route,
						is_expanded: true,
						on_click: (id) => navigate(`/projects/${project_id}/${id}`)
					})}
				</div>
				<div>
					<div className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
						Machine Learning
					</div>
					{nav_section({
						items: PROJECT_ML_ITEMS,
						current_id: sub_route,
						is_expanded: true,
						on_click: (id) => navigate(`/projects/${project_id}/${id}`)
					})}
				</div>
			</nav>
		</aside>
	)
}
