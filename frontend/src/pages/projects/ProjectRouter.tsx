import { useState, useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { supabase } from '../../utils/supabase'
import { use_auth } from '../../contexts/auth_context'
import { project_sidebar as ProjectSidebar } from '../../components/Sidebar/project_sidebar'
import { use_project_store } from '../../store/projectStore'
import { map_project, type DbProject } from '../../utils/project_mapping'
import type { Project } from '../../store/projectStore'
import { use_app_context } from '../../contexts/app_context'
import { project_dashboard } from '../ProjectDashboard'
import DatasetsView from '../DatasetsView'
import AnnotationStudio from '../AnnotationStudio'
import WorkflowBuilder from '../WorkflowBuilder'
import PlaceholderPage from '../../components/page_placeholder'

export default function project_router() {
	const { is_dark_mode, open_uploader } = use_app_context()
	const { user } = use_auth()
	const params = useParams()
	const project_id = params.projectId
	const location = useLocation()
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

	const sub_route = location.pathname.split('/').filter(Boolean).pop() ?? 'dashboard'
	const is_annotation = sub_route === 'annotation'

	return (
		<div className="flex flex-1 min-w-0 overflow-hidden">
			<ProjectSidebar />

			<main className="flex flex-col flex-1 min-w-0">
				<div className={is_annotation ? 'flex-1' : 'flex-1 overflow-y-auto'}>
					{project_error ? (
						<div className="flex items-center justify-center h-full">
							<p className="text-sm text-red-500">{project_error}</p>
						</div>
					) : is_annotation ? (
						<AnnotationStudio isDarkMode={is_dark_mode} />
					) : sub_route === 'dashboard' ? (
						project ? (
							project_dashboard({
								project,
								is_dark_mode,
								on_open_uploader: open_uploader
							})
						) : (
							<div className="flex items-center justify-center h-full">
								<div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
							</div>
						)
					) : sub_route === 'datasets' ? (
						<div className="p-4 lg:p-8">
							<div className="max-w-7xl mx-auto">
								<DatasetsView isDarkMode={is_dark_mode} onUpload={open_uploader} />
							</div>
						</div>
					) : sub_route === 'workflow' ? (
						<div className="h-full">
							<WorkflowBuilder is_dark_mode={is_dark_mode} />
						</div>
					) : (
						<div className="h-full">
							<PlaceholderPage />
						</div>
					)}
				</div>
			</main>
		</div>
	)
}
