import { useState, useEffect } from 'react'
import { ImageIcon, Box, Cpu, Filter, Calendar, Activity } from 'lucide-react'
import { stat_card, render_skeleton_cards } from './stat_card'
import { render_training_chart, render_gpu_status } from './charts'
import {
	render_projects_table,
	render_team_activity,
	render_alerts_widget
} from './recent_activity'

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
