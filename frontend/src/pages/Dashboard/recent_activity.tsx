import { CheckCircle2, Clock, Activity, Play, AlertCircle } from 'lucide-react'

export function render_projects_table(
	is_loading: boolean,
	card_classes: string,
	bg_subtle: string,
	border_subtle: string,
	text_muted: string,
	recent_projects: { name: string; status: string; progress: number; type: string; time: string }[],
	isDarkMode: boolean
) {
	const status_tag = (status: string) => {
		switch (status) {
			case 'training':
				return (
					<div className="flex items-center gap-1.5 text-blue-500">
						<Activity size={14} className="animate-pulse" /> Training
					</div>
				)
			case 'deployed':
				return (
					<div className="flex items-center gap-1.5 text-emerald-500">
						<CheckCircle2 size={14} /> Deployed
					</div>
				)
			case 'queued':
				return (
					<div className="flex items-center gap-1.5 text-zinc-500">
						<Clock size={14} /> Queued
					</div>
				)
			case 'annotating':
				return (
					<div className="flex items-center gap-1.5 text-amber-500">
						<Play size={14} /> Annotating
					</div>
				)
			default:
				return undefined
		}
	}

	return (
		<div className={`rounded-xl border flex flex-col ${card_classes} overflow-hidden`}>
			<div className={`px-6 py-5 border-b flex justify-between items-center ${border_subtle}`}>
				<h3 className="font-semibold text-base tracking-tight">Active Projects</h3>
				<button className="text-sm text-blue-500 font-medium hover:text-blue-400">View All</button>
			</div>
			<div className="flex-1 overflow-x-auto">
				{is_loading ? (
					<div className="p-6 space-y-4">
						{[1, 2, 3].map((i) => (
							<div key={i} className={`h-12 w-full rounded animate-pulse ${bg_subtle}`}></div>
						))}
					</div>
				) : (
					<table className="w-full text-sm text-left">
						<thead
							className={`text-xs uppercase bg-zinc-500/5 ${text_muted} border-b ${border_subtle}`}
						>
							<tr>
								<th className="px-6 py-3 font-medium">Project</th>
								<th className="px-6 py-3 font-medium">Status</th>
								<th className="px-6 py-3 font-medium hidden sm:table-cell">Progress</th>
								<th className="px-6 py-3 font-medium text-right">Updated</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-zinc-800/20">
							{recent_projects.map((project, i) => (
								<tr key={i} className={`hover:bg-zinc-500/5 transition-colors`}>
									<td className="px-6 py-4">
										<div className="font-medium">{project.name}</div>
										<div className={`text-xs mt-0.5 ${text_muted}`}>{project.type}</div>
									</td>
									<td className="px-6 py-4 flex items-center gap-2">
										{status_tag(project.status)}
									</td>
									<td className="px-6 py-4 hidden sm:table-cell w-48">
										<div className="flex items-center gap-2">
											<div
												className={`h-1.5 flex-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}
											>
												<div
													className={`h-full rounded-full ${project.status === 'deployed' ? 'bg-emerald-500' : project.status === 'training' ? 'bg-blue-500' : 'bg-zinc-500'}`}
													style={{ width: `${project.progress}%` }}
												/>
											</div>
											<span className={`text-xs ${text_muted} w-8`}>{project.progress}%</span>
										</div>
									</td>
									<td className={`px-6 py-4 text-right text-xs ${text_muted}`}>{project.time}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	)
}

export function render_team_activity(
	is_loading: boolean,
	card_classes: string,
	bg_subtle: string,
	team_activity: { user: string; name: string; action: string; target: string; time: string }[],
	isDarkMode: boolean
) {
	const text_muted = isDarkMode ? 'text-zinc-400' : 'text-zinc-500'

	return (
		<div className={`rounded-xl border p-6 ${card_classes}`}>
			<div className="flex justify-between items-center mb-6">
				<h3 className="font-semibold text-base tracking-tight">Team Activity</h3>
			</div>
			{is_loading ? (
				<div className="space-y-4">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className={`h-10 w-full rounded animate-pulse ${bg_subtle}`}></div>
					))}
				</div>
			) : (
				<div className="space-y-4">
					{team_activity.map((activity, i) => (
						<div key={i} className="flex gap-3">
							<div
								className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center text-xs font-medium ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}
							>
								{activity.user}
							</div>
							<div className="flex-1 min-w-0">
								<div className="text-sm truncate">
									<span className="font-medium mr-1">{activity.name}</span>
									<span className={text_muted}>{activity.action}</span>
									<span className="font-medium ml-1 truncate">{activity.target}</span>
								</div>
								<div className={`text-xs ${text_muted} mt-0.5`}>{activity.time}</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

export function render_alerts_widget(
	is_loading: boolean,
	card_classes: string,
	bg_subtle: string,
	isDarkMode: boolean
) {
	return (
		<div className={`rounded-xl border p-6 ${card_classes}`}>
			<h3 className="font-semibold text-base tracking-tight mb-4 flex items-center gap-2">
				<AlertCircle size={16} className="text-amber-500" /> Defaults & Alerts
			</h3>
			{is_loading ? (
				<div className="space-y-3">
					{[1, 2].map((i) => (
						<div key={i} className={`h-16 w-full rounded animate-pulse ${bg_subtle}`}></div>
					))}
				</div>
			) : (
				<div className="space-y-3">
					<div
						className={`p-3 rounded-lg border flex gap-3 text-sm ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}
					>
						<div className="mt-0.5">
							<AlertCircle size={16} className="text-amber-500" />
						</div>
						<div>
							<div className={`font-medium ${isDarkMode ? 'text-amber-400' : 'text-amber-800'}`}>
								Class imbalance
							</div>
							<div
								className={`text-xs mt-1 ${isDarkMode ? 'text-amber-500/70' : 'text-amber-700/70'}`}
							>
								'Pedestrian' class is under-represented in AutoDrive v4 (12%).
							</div>
						</div>
					</div>
					<div
						className={`p-3 rounded-lg border flex gap-3 text-sm ${isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'}`}
					>
						<div className="mt-0.5">
							<AlertCircle size={16} className="text-red-500" />
						</div>
						<div>
							<div className={`font-medium ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>
								Low GPU Mem
							</div>
							<div className={`text-xs mt-1 ${isDarkMode ? 'text-red-500/70' : 'text-red-700/70'}`}>
								Cluster C is operating at 92% memory capacity.
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
