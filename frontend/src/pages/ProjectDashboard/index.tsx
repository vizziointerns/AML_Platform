import { ImageIcon } from 'lucide-react'
import type { Project } from '../../store/projectStore'

export function project_dashboard({
	project,
	is_dark_mode,
	on_open_uploader
}: {
	project: Project
	is_dark_mode: boolean
	on_open_uploader: () => void
}) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'

	return (
		<div className="flex-1 overflow-y-auto p-4 lg:p-8">
			<div className="max-w-7xl mx-auto space-y-6">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
						<p className={`text-sm mt-1 ${text_muted}`}>
							{project.name} — project overview and statistics.
						</p>
					</div>
					<div className="flex gap-2">
						<button
							onClick={on_open_uploader}
							className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm transition-colors"
						>
							Upload Data
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<div className={`p-5 rounded-xl border flex flex-col ${card_classes}`}>
						<div className={`text-sm font-medium ${text_muted} mb-3`}>Images</div>
						<div className="text-2xl font-bold tracking-tight">
							{project.datasetCount.toLocaleString()}
						</div>
					</div>
					<div className={`p-5 rounded-xl border flex flex-col ${card_classes}`}>
						<div className={`text-sm font-medium ${text_muted} mb-3`}>Annotation Progress</div>
						<div className="text-2xl font-bold tracking-tight">{project.annotationProgress}%</div>
						<div
							className={`mt-2 h-1.5 rounded-full overflow-hidden ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
						>
							<div
								className="h-full bg-blue-500 rounded-full"
								style={{
									width: `${project.annotationProgress}%`
								}}
							/>
						</div>
					</div>
					<div className={`p-5 rounded-xl border flex flex-col ${card_classes}`}>
						<div className={`text-sm font-medium ${text_muted} mb-3`}>Type</div>
						<div className="text-lg font-bold tracking-tight">{project.type}</div>
					</div>
					<div className={`p-5 rounded-xl border flex flex-col ${card_classes}`}>
						<div className={`text-sm font-medium ${text_muted} mb-3`}>Members</div>
						<div className="text-2xl font-bold tracking-tight">{project.members.length}</div>
					</div>
				</div>

				<div className={`rounded-xl border ${card_classes} p-5`}>
					<h3 className="font-semibold text-base tracking-tight mb-4">Quick Actions</h3>
					<div className="flex flex-wrap gap-3">
						<button
							onClick={on_open_uploader}
							className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
						>
							<ImageIcon size={16} /> Upload Data
						</button>
						<button
							className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${is_dark_mode ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
						>
							Start Annotation
						</button>
						<button
							className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${is_dark_mode ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
						>
							Export Dataset
						</button>
					</div>
				</div>

				<div className={`rounded-xl border ${card_classes} p-5`}>
					<h3 className="font-semibold text-base tracking-tight mb-4">Team Members</h3>
					<div className="flex flex-wrap gap-2">
						{project.members.map((member, i) => (
							<div
								key={i}
								className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${bg_subtle} ${is_dark_mode ? 'text-zinc-300' : 'text-zinc-700'}`}
							>
								<div
									className={`w-6 h-6 rounded-full text-[10px] font-medium flex items-center justify-center ${is_dark_mode ? 'bg-zinc-700' : 'bg-zinc-300'}`}
								>
									{member[0]}
								</div>
								{member}
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
