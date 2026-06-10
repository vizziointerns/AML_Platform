import { use_app_context } from '../../contexts/app_context'
import HomePage from './index'

export default function home_shell() {
	const { is_dark_mode, open_uploader, open_new_project } = use_app_context()
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'

	return (
		<main className="flex flex-col flex-1 min-w-0">
			<div className="flex-1 overflow-y-auto p-4 lg:p-8">
				<div className="max-w-7xl mx-auto space-y-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
						<div>
							<h1 className="text-2xl font-semibold tracking-tight">Home</h1>
							<p className={`text-sm mt-1 ${text_muted}`}>
								Welcome to your workspace. Overview of all projects.
							</p>
						</div>
					</div>
					<HomePage
						is_dark_mode={is_dark_mode}
						on_open_uploader={open_uploader}
						on_open_new_project={open_new_project}
					/>
				</div>
			</div>
		</main>
	)
}
