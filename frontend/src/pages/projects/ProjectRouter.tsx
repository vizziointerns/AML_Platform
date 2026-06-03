import { useLocation, useParams } from 'react-router-dom'
import { project_sidebar as ProjectSidebar } from '../../components/Sidebar/project_sidebar'
import { use_project_store } from '../../store/projectStore'
import { use_app_context } from '../../contexts/app_context'
import { project_dashboard } from '../ProjectDashboard'
import DatasetsView from '../DatasetsView'
import AnnotationStudio from '../AnnotationStudio'
import WorkflowBuilder from '../WorkflowBuilder'
import PlaceholderPage from '../../components/page_placeholder'

export default function project_router() {
	const { is_dark_mode, open_uploader } = use_app_context()
	const params = useParams()
	const project_id = params.projectId
	const location = useLocation()
	const projects = use_project_store((s) => s.projects)
	const project = projects.find((p) => p.id === project_id)

	const sub_route = location.pathname.split('/').filter(Boolean).pop() ?? 'dashboard'
	const is_annotation = sub_route === 'annotation'

	return (
		<div className="flex flex-1 min-w-0 overflow-hidden">
			<ProjectSidebar />

			<main className="flex flex-col flex-1 min-w-0">
				<div className={is_annotation ? 'flex-1' : 'flex-1 overflow-y-auto'}>
					{is_annotation ? (
						<AnnotationStudio isDarkMode={is_dark_mode} />
					) : sub_route === 'dashboard' ? (
						project_dashboard({
							project: project!,
							is_dark_mode,
							on_open_uploader: open_uploader
						})
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
