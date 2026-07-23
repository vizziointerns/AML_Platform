import { MoreVertical } from 'lucide-react'
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

export function render_training_chart(
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
				<button
					className={`p-1.5 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-400`}
				>
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

export function render_gpu_status(
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
