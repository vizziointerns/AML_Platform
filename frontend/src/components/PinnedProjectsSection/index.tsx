import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pin, Clock, ChevronDown, ChevronRight, ThumbsUp } from 'lucide-react'
import type { Project } from '../../store/projectStore'

export function pinned_projects_section({
	projects,
	is_dark_mode,
	on_pin_toggle
}: {
	projects: Project[]
	is_dark_mode: boolean
	on_pin_toggle: (id: string) => void
}) {
	const [is_collapsed, set_is_collapsed] = useState(false)
	const navigate = useNavigate()

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'

	return (
		<div className={`rounded-xl border ${border_subtle} ${bg_card} overflow-hidden`}>
			<button
				onClick={() => set_is_collapsed(!is_collapsed)}
				className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors ${
					is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
				}`}
			>
				<div className="flex items-center gap-2">
					<Pin size={16} className="text-yellow-500" fill="currentColor" />
					<h2 className={`text-sm font-semibold ${text_heading}`}>Pinned Projects</h2>
					<span className={`text-xs ${text_muted} ml-1`}>({projects.length})</span>
				</div>
				{is_collapsed ? (
					<ChevronRight size={16} className={text_muted} />
				) : (
					<ChevronDown size={16} className={text_muted} />
				)}
			</button>

			{!is_collapsed && (
				<div className="px-5 pb-4">
					{projects.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<ThumbsUp size={24} className={`${text_muted} mb-2`} />
							<p className={`text-sm ${text_muted}`}>No pinned projects yet.</p>
							<p className={`text-xs ${text_muted} mt-1`}>
								Pin your most important projects to find them quickly.
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
							{projects.map((project) => (
								<div
									key={project.id}
									onClick={() => navigate(`/projects/${project.id}/dashboard`)}
									className={`rounded-lg border ${border_subtle} bg-opacity-50 p-3.5 hover:shadow-md transition-all cursor-pointer relative ${
										is_dark_mode
											? 'bg-yellow-500/5 border-yellow-500/20'
											: 'bg-yellow-50/80 border-yellow-200'
									}`}
								>
									<div className="flex items-start justify-between mb-2">
										<div className="flex items-center gap-2.5 min-w-0">
											<div
												className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
													is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'
												} ${text_heading}`}
											>
												{project.name[0]}
											</div>
											<div className="min-w-0">
												<h3 className={`text-sm font-medium truncate ${text_heading}`}>
													{project.name}
												</h3>
												<span className={`text-[11px] ${text_muted}`}>{project.type}</span>
											</div>
										</div>
										<button
											onClick={(e) => {
												e.stopPropagation()
												on_pin_toggle(project.id)
											}}
											title="Unpin project"
											className="p-1 rounded shrink-0 text-yellow-500 hover:text-yellow-400"
										>
											<Pin size={13} fill="currentColor" />
										</button>
									</div>

									<div className="space-y-1.5">
										<div className="flex justify-between text-[11px]">
											<span className={text_muted}>{project.datasetCount} images</span>
											<span className={text_muted}>{project.annotationProgress}% annotated</span>
										</div>
										<div
											className={`h-1 rounded-full overflow-hidden ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
										>
											<div
												className="h-full bg-yellow-500 rounded-full transition-all"
												style={{ width: `${project.annotationProgress}%` }}
											/>
										</div>
									</div>

									<div className="flex items-center justify-between mt-2.5 pt-2.5 border-t">
										<div className="flex items-center gap-1.5 text-[11px]">
											<Clock size={11} className={text_muted} />
											<span className={text_muted}>
												{new Date(project.lastUpdated).toLocaleDateString()}
											</span>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	)
}
