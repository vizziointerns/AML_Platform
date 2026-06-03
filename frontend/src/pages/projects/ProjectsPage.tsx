import ProjectsView from './ProjectsView'

export default function projects_page() {
	return (
		<main className="flex flex-col flex-1 min-w-0">
			<div className="flex-1 overflow-y-auto">
				<ProjectsView />
			</div>
		</main>
	)
}
