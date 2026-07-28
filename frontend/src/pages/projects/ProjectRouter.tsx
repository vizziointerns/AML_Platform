import { useState, useEffect } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../utils/supabase'
import { use_auth } from '../../contexts/auth_context'
import { project_sidebar as ProjectSidebar } from '../../components/Sidebar/project_sidebar'
import { use_project_store } from '../../store/projectStore'
import { map_project, type DbProject } from '../../utils/project_mapping'
import type { Project } from '../../store/projectStore'
import { use_app_context } from '../../contexts/app_context'
import { PROJECT_NAV_ITEMS, PROJECT_ML_ITEMS } from '../../config/navigation'
import { project_dashboard as ProjectDashboard } from './pages/dashboard'
import DatasetsView from './pages/datasets'
import AnnotationStudio from './pages/annotation'
import ModelsPage from './pages/models'
import TrainingPage from './pages/training'
import PlaceholderPage from '../../components/page_placeholder'

export default function project_router() {
	const { is_dark_mode, open_uploader } = use_app_context()
	const { user } = use_auth()
	const params = useParams()
	const project_id = params.projectId
	const location = useLocation()
	const navigate = useNavigate()
	const projects = use_project_store((s) => s.projects)
	const [project, set_project] = useState<Project | undefined>(
		projects.find((p) => p.id === project_id)
	)
	const [project_error, set_project_error] = useState<string | undefined>()

	useEffect(() => {
		const from_store = projects.find((p) => p.id === project_id)
		if (from_store) {
			set_project(from_store)
			set_project_error(undefined)
			return
		}

		if (!user || !project_id) return

		let is_current = true

		supabase
			.from('projects')
			.select('*')
			.eq('id', project_id)
			.eq('user_id', user.id)
			.single()
			.then(({ data, error: err }) => {
				if (!is_current) return

				if (err) {
					console.error('Project fetch error:', err)
					set_project_error(err.message)
					return
				}

				if (data) {
					const mapped = map_project(data as DbProject)
					set_project(mapped)
					set_project_error(undefined)
				}
			})

		return () => {
			is_current = false
		}
	}, [project_id, user, projects])

	const path_segments = location.pathname.split('/').filter(Boolean)
	const last_segment = path_segments[path_segments.length - 1] ?? ''
	const second_last = path_segments[path_segments.length - 2] ?? ''
	const has_annotation = path_segments.includes('annotation')
	const image_id = has_annotation && path_segments.length >= 4 ? last_segment : undefined
	const sub_route = has_annotation
		? 'annotation'
		: second_last === 'datasets'
			? 'datasets'
			: last_segment || 'dashboard'
	const is_annotation = sub_route === 'annotation'

	const render_page = () => {
		if (project_error) {
			return (
				<div className="flex items-center justify-center h-full">
					<p className="text-sm text-red-500">{project_error}</p>
				</div>
			)
		}
		if (is_annotation) {
			return <AnnotationStudio isDarkMode={is_dark_mode} imageId={image_id} project={project} />
		}
		if (sub_route === 'dashboard') {
			return project ? (
				<ProjectDashboard project={project} is_dark_mode={is_dark_mode} />
			) : (
				<div className="flex items-center justify-center h-full">
					<div className="loading-spinner" />
				</div>
			)
		}
		if (sub_route === 'datasets') {
			return (
				<div className="p-4 lg:p-8">
					<div className="max-w-7xl mx-auto">
						<DatasetsView is_dark_mode={is_dark_mode} on_upload={open_uploader} />
					</div>
				</div>
			)
		}
		if (sub_route === 'models') {
			return <ModelsPage is_dark_mode={is_dark_mode} />
		}
		if (sub_route === 'training') {
			return <TrainingPage is_dark_mode={is_dark_mode} />
		}
		return (
			<div className="h-full">
				<PlaceholderPage />
			</div>
		)
	}

	const nav_tabs = [...PROJECT_NAV_ITEMS, ...PROJECT_ML_ITEMS]

	return (
		<div className="flex flex-1 min-w-0 overflow-hidden">
			{!is_annotation && <ProjectSidebar />}

			<main className="flex flex-col flex-1 min-w-0">
				{!is_annotation && (
					<div
						className={`lg:hidden flex items-center gap-1 px-3 py-2 overflow-x-auto hide-scrollbar border-b shrink-0 ${
							is_dark_mode ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-200 bg-white'
						}`}
					>
						{nav_tabs.map((tab) => {
							const ICON = tab.icon
							const is_active = sub_route === tab.id
							return (
								<button
									key={tab.id}
									onClick={() => navigate(`/projects/${project_id}/${tab.id}`)}
									className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
										is_active
											? 'bg-blue-600 text-white shadow-sm'
											: is_dark_mode
												? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
												: 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
									}`}
								>
									<ICON size={14} />
									{tab.label}
								</button>
							)
						})}
					</div>
				)}
				<div className={is_annotation ? 'flex-1' : 'flex-1 overflow-y-auto'}>{render_page()}</div>
			</main>
		</div>
	)
}
