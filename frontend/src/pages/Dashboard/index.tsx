import React, { useState, useEffect } from 'react'
import {
	ImageIcon,
	Box,
	Cpu,
	MoreVertical,
	CheckCircle2,
	AlertCircle,
	Clock,
	ArrowUpRight,
	ArrowDownRight,
	Filter,
	Calendar,
	Activity,
	Play
} from 'lucide-react'
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	BarChart,
	Bar,
	Cell
} from 'recharts'

function stat_card(
	{
		title,
		value,
		icon: Icon,
		trend,
		trendUp
	}: {
		title: string
		value: string
		icon: React.ComponentType<{ size?: number; className?: string }>
		trend: string
		trendUp: boolean
	},
	isDarkMode: boolean,
	card_classes: string,
	text_muted: string
) {
	return (
		<div className={`p-6 rounded-xl border flex flex-col ${card_classes}`}>
			<div className="flex justify-between items-start mb-4">
				<div className={`text-sm font-medium ${text_muted}`}>{title}</div>
				<div className={`p-2 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
					<Icon size={18} className={isDarkMode ? 'text-zinc-300' : 'text-zinc-600'} />
				</div>
			</div>
			<div className="text-3xl font-bold tracking-tight mb-2">{value}</div>
			<div className={`flex items-center text-sm ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
				{trendUp ? (
					<ArrowUpRight size={16} className="mr-1" />
				) : (
					<ArrowDownRight size={16} className="mr-1" />
				)}
				<span>{trend}</span>
				<span className={`ml-2 ${text_muted}`}>vs last period</span>
			</div>
		</div>
	)
}

function render_skeleton_cards(card_classes: string, bg_subtle: string) {
	return Array(4)
		.fill(0)
		.map((_, i) => (
			<div
				key={i}
				className={`p-6 rounded-xl border ${card_classes} min-h-[140px] flex flex-col justify-between`}
			>
				<div className="flex justify-between">
					<div className={`h-4 w-24 rounded animate-pulse ${bg_subtle}`}></div>
					<div className={`h-8 w-8 rounded-lg animate-pulse ${bg_subtle}`}></div>
				</div>
				<div className={`h-8 w-16 rounded animate-pulse ${bg_subtle} mt-4`}></div>
				<div className={`h-4 w-32 rounded animate-pulse ${bg_subtle} mt-2`}></div>
			</div>
		))
}

function render_training_chart(
	is_loading: boolean,
	card_classes: string,
	bg_subtle: string,
	training_data: { time: string; map: number; f1: number }[],
	isDarkMode: boolean
) {
	return (
		<div className={`rounded-xl border p-6 flex flex-col ${card_classes}`}>
			<div className="flex justify-between items-center mb-6">
				<h3 className="font-semibold text-base tracking-tight">Model Training Performance</h3>
				<button className={`p-1.5 rounded-md hover:${bg_subtle} text-zinc-400`}>
					<MoreVertical size={18} />
				</button>
			</div>
			{is_loading ? (
				<div className={`w-full h-[300px] rounded-lg animate-pulse ${bg_subtle}`}></div>
			) : (
				<div className="h-[300px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={training_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
							<defs>
								<linearGradient id="colorMap" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
									<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
								</linearGradient>
								<linearGradient id="colorF1" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
									<stop offset="95%" stopColor="#10b981" stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid
								strokeDasharray="3 3"
								vertical={false}
								stroke={isDarkMode ? '#27272a' : '#e4e4e7'}
							/>
							<XAxis
								dataKey="time"
								axisLine={false}
								tickLine={false}
								tick={{ fill: isDarkMode ? '#a1a1aa' : '#71717a', fontSize: 12 }}
								dy={10}
							/>
							<YAxis
								axisLine={false}
								tickLine={false}
								tick={{ fill: isDarkMode ? '#a1a1aa' : '#71717a', fontSize: 12 }}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
									borderColor: isDarkMode ? '#27272a' : '#e4e4e7',
									borderRadius: '8px'
								}}
								itemStyle={{ color: isDarkMode ? '#f4f4f5' : '#18181b' }}
							/>
							<Area
								type="monotone"
								dataKey="map"
								name="mAP Score"
								stroke="#3b82f6"
								strokeWidth={2}
								fillOpacity={1}
								fill="url(#colorMap)"
							/>
							<Area
								type="monotone"
								dataKey="f1"
								name="F1 Score"
								stroke="#10b981"
								strokeWidth={2}
								fillOpacity={1}
								fill="url(#colorF1)"
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			)}
		</div>
	)
}

function render_projects_table(
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

function render_gpu_status(
	is_loading: boolean,
	card_classes: string,
	bg_subtle: string,
	gpu_data: { name: string; load: number; color: string }[],
	isDarkMode: boolean
) {
	return (
		<div className={`rounded-xl border p-6 ${card_classes}`}>
			<div className="flex justify-between items-center mb-6">
				<h3 className="font-semibold text-base tracking-tight">GPU Cluster Status</h3>
			</div>
			{is_loading ? (
				<div className={`w-full h-[200px] rounded animate-pulse ${bg_subtle}`}></div>
			) : (
				<div className="space-y-4">
					<div className="h-[180px] w-full mt-2">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={gpu_data}
								layout="vertical"
								margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
							>
								<XAxis type="number" hide domain={[0, 100]} />
								<YAxis dataKey="name" type="category" hide />
								<Tooltip
									cursor={{ fill: isDarkMode ? '#27272a50' : '#f4f4f550' }}
									contentStyle={{
										backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
										borderColor: isDarkMode ? '#27272a' : '#e4e4e7',
										borderRadius: '8px'
									}}
								/>
								<Bar dataKey="load" radius={[0, 4, 4, 0]} barSize={12}>
									{gpu_data.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={entry.color} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
					<div className="space-y-3">
						{gpu_data.map((node, i) => (
							<div key={i} className="flex justify-between items-center text-sm">
								<div className="flex items-center gap-2">
									<div
										className="w-2 h-2 rounded-full"
										style={{ backgroundColor: node.color }}
									></div>
									<span className={isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}>
										{node.name}
									</span>
								</div>
								<span className="font-medium">{node.load}%</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

function render_team_activity(
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

function render_alerts_widget(
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

export default function dashboard({ isDarkMode }: { isDarkMode: boolean }) {
	const [is_loading, set_is_loading] = useState(true)
	const [time_range, set_time_range] = useState('7d')

	useEffect(() => {
		const timer = setTimeout(() => {
			set_is_loading(false)
		}, 1500)
		return () => clearTimeout(timer)
	}, [time_range])

	const card_classes = isDarkMode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'

	const text_muted = isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = isDarkMode ? 'border-zinc-800' : 'border-zinc-100'
	const bg_subtle = isDarkMode ? 'bg-zinc-800/50' : 'bg-zinc-50'

	const training_data = [
		{ time: 'Mon', map: 0.65, f1: 0.55 },
		{ time: 'Tue', map: 0.72, f1: 0.61 },
		{ time: 'Wed', map: 0.78, f1: 0.68 },
		{ time: 'Thu', map: 0.84, f1: 0.74 },
		{ time: 'Fri', map: 0.89, f1: 0.81 },
		{ time: 'Sat', map: 0.92, f1: 0.85 },
		{ time: 'Sun', map: 0.94, f1: 0.88 }
	]

	const gpu_data = [
		{ name: 'Cluster A', load: 85, color: '#3b82f6' },
		{ name: 'Cluster B', load: 45, color: '#10b981' },
		{ name: 'Cluster C', load: 92, color: '#ef4444' },
		{ name: 'Edge Devices', load: 20, color: '#8b5cf6' }
	]

	const recent_projects = [
		{
			name: 'Autonomous Driving v4',
			status: 'training',
			progress: 78,
			type: 'Object Detection',
			time: '2h ago'
		},
		{
			name: 'Traffic Cam Analysis',
			status: 'deployed',
			progress: 100,
			type: 'Classification',
			time: '5h ago'
		},
		{
			name: 'Pedestrian Tracking',
			status: 'queued',
			progress: 0,
			type: 'Segmentation',
			time: '1d ago'
		},
		{
			name: 'Retail Items DB',
			status: 'annotating',
			progress: 45,
			type: 'Object Detection',
			time: '2d ago'
		}
	]

	const team_activity = [
		{
			user: 'SF',
			name: 'Sarah Faraday',
			action: 'deployed model',
			target: 'Traffic Cam v2',
			time: '10m ago'
		},
		{
			user: 'JD',
			name: 'John Doe',
			action: 'uploaded dataset',
			target: 'Urban Drive 10k',
			time: '1h ago'
		},
		{
			user: 'MR',
			name: 'Maria Rodriguez',
			action: 'started training',
			target: 'AutoDrive v4',
			time: '2h ago'
		},
		{
			user: 'AK',
			name: 'Alex Kim',
			action: 'completed annotation',
			target: 'Retail 500',
			time: '5h ago'
		}
	]

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div
					className={`inline-flex rounded-lg border p-1 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
				>
					{['24h', '7d', '30d', 'All'].map((t) => (
						<button
							key={t}
							onClick={() => set_time_range(t)}
							className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${time_range === t ? (isDarkMode ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-900') : isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
						>
							{t}
						</button>
					))}
				</div>
				<div className="flex gap-2">
					<button
						className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
					>
						<Filter size={16} /> Filter
					</button>
					<button
						className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
					>
						<Calendar size={16} /> Export Report
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{is_loading ? (
					render_skeleton_cards(card_classes, bg_subtle)
				) : (
					<>
						{stat_card(
							{
								title: 'Total Images',
								value: '2.4M',
								icon: ImageIcon,
								trend: '12.5%',
								trendUp: true
							},
							isDarkMode,
							card_classes,
							text_muted
						)}
						{stat_card(
							{
								title: 'Avg mAP Score',
								value: '0.84',
								icon: Activity,
								trend: '4.2%',
								trendUp: true
							},
							isDarkMode,
							card_classes,
							text_muted
						)}
						{stat_card(
							{ title: 'Active Models', value: '12', icon: Box, trend: '2', trendUp: true },
							isDarkMode,
							card_classes,
							text_muted
						)}
						{stat_card(
							{ title: 'GPU Utilization', value: '86%', icon: Cpu, trend: '5.1%', trendUp: false },
							isDarkMode,
							card_classes,
							text_muted
						)}
					</>
				)}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					{render_training_chart(is_loading, card_classes, bg_subtle, training_data, isDarkMode)}
					{render_projects_table(
						is_loading,
						card_classes,
						bg_subtle,
						border_subtle,
						text_muted,
						recent_projects,
						isDarkMode
					)}
				</div>

				<div className="space-y-6">
					{render_gpu_status(is_loading, card_classes, bg_subtle, gpu_data, isDarkMode)}
					{render_alerts_widget(is_loading, card_classes, bg_subtle, isDarkMode)}
					{render_team_activity(is_loading, card_classes, bg_subtle, team_activity, isDarkMode)}
				</div>
			</div>
		</div>
	)
}
