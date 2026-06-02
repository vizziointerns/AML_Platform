import { use_project_store } from '../../store/projectStore'
import { use_navigation_store } from '../../store/navigationStore'
import { Layers, ImageIcon, Users, HardDrive, Clock, Plus, ChevronRight } from 'lucide-react'

function stat_card({
	title,
	value,
	icon: Icon,
	is_dark_mode,
	text_muted
}: {
	title: string
	value: string
	icon: React.ElementType
	is_dark_mode: boolean
	text_muted: string
}) {
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'

	return (
		<div className={`p-5 rounded-xl border flex flex-col ${card_classes}`}>
			<div className="flex justify-between items-start mb-3">
				<div className={`text-sm font-medium ${text_muted}`}>{title}</div>
				<div className={`p-2 rounded-lg ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
					<Icon
						size={18}
						className={is_dark_mode ? 'text-zinc-300' : 'text-zinc-600'}
					/>
				</div>
			</div>
			<div className="text-2xl font-bold tracking-tight">{value}</div>
		</div>
	)
}

export default function home({ is_dark_mode }: { is_dark_mode: boolean }) {
	const projects = use_project_store((s) => s.projects)
	const enter_project = use_navigation_store((s) => s.enterProject)

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'

	const total_images = projects.reduce((sum, p) => sum + p.datasetCount, 0)
	const all_members = new Set(projects.flatMap((p) => p.members))
	const sorted = [...projects].sort((a, b) => b.lastUpdated - a.lastUpdated)
	const recent = sorted.slice(0, 4)

	const format_count = (n: number): string => {
		if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
		if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
		return n.toString()
	}

	return (
		<div className="space-y-8">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{stat_card({
					title: 'Total Projects',
					value: projects.length.toString(),
					icon: Layers,
					is_dark_mode,
					text_muted
				})}
				{stat_card({
					title: 'Total Images',
					value: format_count(total_images),
					icon: ImageIcon,
					is_dark_mode,
					text_muted
				})}
				{stat_card({
					title: 'Team Members',
					value: all_members.size.toString(),
					icon: Users,
					is_dark_mode,
					text_muted
				})}
				{stat_card({
					title: 'Storage Used',
					value: '14.2 GB',
					icon: HardDrive,
					is_dark_mode,
					text_muted
				})}
			</div>

			<div>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold tracking-tight">Recent Projects</h2>
					<button
						className="flex items-center gap-1 text-sm text-blue-500 font-medium hover:text-blue-400"
					>
						View All <ChevronRight size={14} />
					</button>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{recent.map((project) => (
						<div
							key={project.id}
							onClick={() => enter_project(project.id)}
							className={`rounded-xl border ${border_subtle} ${card_classes} p-4 hover:shadow-lg transition-all cursor-pointer`}
						>
							<div className="flex items-start justify-between mb-3">
								<div className="flex items-center gap-3">
									<div
										className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'} ${is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'}`}
									>
										{project.name[0]}
									</div>
									<div className="min-w-0">
										<h3 className="font-medium text-sm truncate max-w-28">{project.name}</h3>
										<span className={`text-xs ${text_muted}`}>{project.type}</span>
									</div>
								</div>
								<div
									className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
										project.status === 'Active'
											? 'bg-emerald-500/10 text-emerald-500'
											: project.status === 'Draft'
												? 'bg-zinc-500/10 text-zinc-500'
												: project.status === 'Completed'
													? 'bg-blue-500/10 text-blue-500'
													: 'bg-amber-500/10 text-amber-500'
									}`}
								>
									{project.status}
								</div>
							</div>
							<div className="space-y-2">
								<div className="flex justify-between text-xs ${text_muted}">
									<span>{format_count(project.datasetCount)} images</span>
									<span>{project.annotationProgress}% annotated</span>
								</div>
								<div
									className={`h-1.5 rounded-full overflow-hidden ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
								>
									<div
										className="h-full bg-blue-500 rounded-full transition-all"
										style={{ width: `${project.annotationProgress}%` }}
									/>
								</div>
							</div>
							<div className="flex items-center justify-between mt-3 pt-3 ${border_subtle}">
								<div className="flex items-center gap-1.5 text-xs ${text_muted}">
									<Clock size={12} />
									{new Date(project.lastUpdated).toLocaleDateString()}
								</div>
								<div className="flex -space-x-1.5">
									{project.members.slice(0, 3).map((m, i) => (
										<div
											key={i}
											className={`w-5 h-5 rounded-full text-[9px] font-medium flex items-center justify-center border-2 ${is_dark_mode ? 'border-zinc-900 bg-zinc-800 text-zinc-300' : 'border-white bg-zinc-200 text-zinc-600'}`}
											title={m}
										>
											{m[0]}
										</div>
									))}
									{project.members.length > 3 && (
										<div
											className={`w-5 h-5 rounded-full text-[9px] font-medium flex items-center justify-center border-2 ${is_dark_mode ? 'border-zinc-900 bg-zinc-800 text-zinc-400' : 'border-white bg-zinc-200 text-zinc-500'}`}
										>
											+{project.members.length - 3}
										</div>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			<div className={`rounded-xl border ${card_classes} p-5`}>
				<h3 className="font-semibold text-base tracking-tight mb-4">Quick Actions</h3>
				<div className="flex flex-wrap gap-3">
					<button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
						<Plus size={16} /> New Project
					</button>
					<button
						className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${is_dark_mode ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
					>
						<ImageIcon size={16} /> Upload Data
					</button>
				</div>
			</div>
		</div>
	)
}
