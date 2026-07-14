import { use_app_context } from '../../contexts/app_context'
import { use_auth } from '../../contexts/auth_context'
import HomePage from './index'

export default function home_shell() {
	const { user } = use_auth()
	const { is_dark_mode, open_uploader, open_new_project } = use_app_context()

	return (
		<main className="flex flex-col flex-1 min-w-0">
			<div className="page-layout">
				<div className="page-content">
					<div className="page-header mb-8">
						<div>
							<h1 className="text-2xl font-semibold tracking-tight">Home</h1>
							<p className="text-sm mt-1 text-zinc-500 dark:text-zinc-400">
								Overview of all projects and activity.
							</p>
						</div>
					</div>
					<HomePage
						user={user}
						is_dark_mode={is_dark_mode}
						on_open_uploader={open_uploader}
						on_open_new_project={open_new_project}
					/>
				</div>
			</div>
		</main>
	)
}
