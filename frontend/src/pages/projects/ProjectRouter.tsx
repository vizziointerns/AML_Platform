import { useState, useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { supabase } from '../../utils/supabase'
import { use_auth } from '../../contexts/auth_context'
import { project_sidebar as ProjectSidebar } from '../../components/Sidebar/project_sidebar'
import { use_project_store } from '../../store/projectStore'
import type { Project, ProjectType, ProjectStatus } from '../../store/projectStore'
import { use_app_context } from '../../contexts/app_context'
import { project_dashboard } from '../ProjectDashboard'
import DatasetsView from '../DatasetsView'
import AnnotationStudio from '../AnnotationStudio'
import WorkflowBuilder from '../WorkflowBuilder'
import PlaceholderPage from '../../components/page_placeholder'

interface DbProject {
	id: string
	name: string
	description: string
	type: string
	status: string
	dataset_count: number
	annotation_progress: number
	members: string[]
	last_updated: number
	is_pinned: boolean
	is_favorite: boolean
	thumbnail: string
}

function map_project(db: DbProject): Project {
	return {
		id: db.id,
		name: db.name,
		description: db.description,
		type: db.type as ProjectType,
		status: db.status as ProjectStatus,
		datasetCount: db.dataset_count,
		annotationProgress: db.annotation_progress,
		members: db.members ?? [],
		lastUpdated: db.last_updated,
		isPinned: db.is_pinned,
		isFavorite: db.is_favorite,
		thumbnail: db.thumbnail ?? ''
	}
}

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

	useEffect(() => {
		const from_store = projects.find((p) => p.id === project_id)
		if (from_store) {
			set_project(from_store)
			return
		}

		if (!user || !project_id) return

		supabase
			.from('projects')
			.select('*')
			.eq('id', project_id)
			.eq('user_id', user.id)
			.single()
			.then(({ data, error: err }) => {
				if (!err && data) {
					const mapped = map_project(data as DbProject)
					set_project(mapped)
				}
			})
	}, [project_id, user, projects])

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
