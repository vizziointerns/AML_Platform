import ErrorBoundary from '../../components/error_boundary'
import ProjectsView from './ProjectsView'

export default function projects_page() {
	return (
		<main className="flex flex-col flex-1 min-w-0">
			<div className="flex-1 overflow-y-auto">
				<ErrorBoundary>
					<ProjectsView />
				</ErrorBoundary>
			</div>
		</main>
	)
}
