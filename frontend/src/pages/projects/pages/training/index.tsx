import { Square, Download, Clock, BarChart3, Activity, Plus } from 'lucide-react'

interface TrainingRun {
	id: number
	name: string
	model: string
	dataset: string
	epochs: number
	current_epoch: number
	status: 'Running' | 'Completed' | 'Failed' | 'Queued'
	accuracy: number
	loss: number
	duration: string
	started: string
}

const MOCK_RUNS: TrainingRun[] = [
	{
		id: 1,
		name: 'YOLOv8 Training v3',
		model: 'YOLOv8 Detection',
		dataset: 'Urban_Vehicles_v4',
		epochs: 100,
		current_epoch: 67,
		status: 'Running',
		accuracy: 0.82,
		loss: 0.34,
		duration: '4h 23m',
		started: '2 hrs ago'
	},
	{
		id: 2,
		name: 'ResNet Fine-tune',
		model: 'ResNet-50 Classifier',
		dataset: 'Retail_Shelves_DB',
		epochs: 50,
		current_epoch: 50,
		status: 'Completed',
		accuracy: 0.91,
		loss: 0.12,
		duration: '1h 45m',
		started: '1 day ago'
	},
	{
		id: 3,
		name: 'SegFormer Training',
		model: 'SegFormer B3',
		dataset: 'Drone_Terrain_Maps',
		epochs: 200,
		current_epoch: 45,
		status: 'Running',
		accuracy: 0.75,
		loss: 0.52,
		duration: '12h 10m',
		started: '6 hrs ago'
	},
	{
		id: 4,
		name: 'EfficientDet v2',
		model: 'EfficientDet D2',
		dataset: 'Pedestrian_Tracking_2023',
		epochs: 80,
		current_epoch: 0,
		status: 'Queued',
		accuracy: 0,
		loss: 0,
		duration: '-',
		started: '- '
	},
	{
		id: 5,
		name: 'ViT Classification',
		model: 'ViT Base Patch16',
		dataset: 'Defect_Inspection',
		epochs: 30,
		current_epoch: 30,
		status: 'Failed',
		accuracy: 0.45,
		loss: 1.23,
		duration: '45m',
		started: '3 days ago'
	}
]

export default function training_page({ is_dark_mode }: { is_dark_mode: boolean }) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'

	const status_tag = (status: string) => {
		switch (status) {
			case 'Running':
				return (
					<span className="flex items-center gap-1.5 text-blue-500 text-xs font-medium">
						<Activity size={14} className="animate-pulse" /> Running
					</span>
				)
			case 'Completed':
				return (
					<span className="flex items-center gap-1.5 text-emerald-500 text-xs font-medium">
						<Download size={14} /> Completed
					</span>
				)
			case 'Failed':
				return (
					<span className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
						<Square size={14} /> Failed
					</span>
				)
			default:
				return (
					<span className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium">
						<Clock size={14} /> Queued
					</span>
				)
		}
	}

	return (
		<div className="page-layout">
			<div className="page-content">
				<div className="page-header">
					<div>
						<h1 className={`text-2xl font-semibold tracking-tight ${text_heading}`}>Training</h1>
						<p className={`text-sm mt-1 ${text_muted}`}>
							Manage model training jobs and monitor progress.
						</p>
					</div>
					<button className="btn-primary">
						<Plus size={16} /> New Training
					</button>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<div className={`stat-card ${bg_card}`}>
						<div className={`text-sm font-medium ${text_muted} mb-3`}>Active Jobs</div>
						<div className={`text-2xl font-bold tracking-tight ${text_heading}`}>2</div>
					</div>
					<div className={`stat-card ${bg_card}`}>
						<div className={`text-sm font-medium ${text_muted} mb-3`}>Avg Accuracy</div>
						<div className={`text-2xl font-bold tracking-tight ${text_heading}`}>78.2%</div>
					</div>
					<div className={`stat-card ${bg_card}`}>
						<div className={`text-sm font-medium ${text_muted} mb-3`}>Avg Loss</div>
						<div className={`text-2xl font-bold tracking-tight ${text_heading}`}>0.43</div>
					</div>
					<div className={`stat-card ${bg_card}`}>
						<div className={`text-sm font-medium ${text_muted} mb-3`}>Total GPU Hours</div>
						<div className={`text-2xl font-bold tracking-tight ${text_heading}`}>18.3</div>
					</div>
				</div>

				<div className={`rounded-xl border ${border_subtle} ${bg_card} overflow-hidden`}>
					<div className={`px-6 py-4 border-b ${border_subtle} flex items-center justify-between`}>
						<h3 className={`font-semibold text-base tracking-tight ${text_heading}`}>
							Training Jobs
						</h3>
						<div
							className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${bg_subtle} ${text_muted}`}
						>
							<BarChart3 size={14} /> 5 total
						</div>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-sm text-left">
							<thead
								className={`text-xs uppercase ${bg_subtle} ${text_muted} border-b ${border_subtle}`}
							>
								<tr>
									<th className="px-6 py-4 font-medium">Name</th>
									<th className="px-6 py-4 font-medium">Model / Dataset</th>
									<th className="px-6 py-4 font-medium">Progress</th>
									<th className="px-6 py-4 font-medium">Accuracy</th>
									<th className="px-6 py-4 font-medium">Loss</th>
									<th className="px-6 py-4 font-medium">Duration</th>
									<th className="px-6 py-4 font-medium">Status</th>
									<th className="px-6 py-4 font-medium"></th>
								</tr>
							</thead>
							<tbody className="divide-y divide-zinc-800/20">
								{MOCK_RUNS.map((run) => (
									<tr key={run.id} className={`hover:${bg_subtle} transition-colors`}>
										<td className="px-6 py-4">
											<div className={`font-medium ${text_heading}`}>{run.name}</div>
										</td>
										<td className="px-6 py-4">
											<div className={text_heading}>{run.model}</div>
											<div className={`text-xs ${text_muted}`}>{run.dataset}</div>
										</td>
										<td className="px-6 py-4 w-40">
											<div className="flex items-center gap-2">
												<div
													className={`h-1.5 flex-1 rounded-full overflow-hidden ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
												>
													<div
														className={`h-full rounded-full ${run.status === 'Completed' ? 'bg-emerald-500' : run.status === 'Failed' ? 'bg-red-500' : run.status === 'Running' ? 'bg-blue-500' : 'bg-zinc-500'}`}
														style={{
															width: `${run.epochs > 0 ? Math.round((run.current_epoch / run.epochs) * 100) : 0}%`
														}}
													/>
												</div>
												<span className={`text-xs ${text_muted} w-12`}>
													{run.current_epoch}/{run.epochs}
												</span>
											</div>
										</td>
										<td className={`px-6 py-4 ${text_heading}`}>
											{(run.accuracy * 100).toFixed(1)}%
										</td>
										<td className={`px-6 py-4 ${text_heading}`}>{run.loss.toFixed(2)}</td>
										<td className={`px-6 py-4 ${text_muted}`}>{run.duration}</td>
										<td className="px-6 py-4">{status_tag(run.status)}</td>
										<td className="px-6 py-4">
											{run.status === 'Running' && (
												<button className="px-3 py-1 text-xs font-medium bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20 transition-colors">
													Stop
												</button>
											)}
											{run.status === 'Completed' && (
												<button className="px-3 py-1 text-xs font-medium bg-blue-500/10 text-blue-500 rounded-md hover:bg-blue-500/20 transition-colors">
													Deploy
												</button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	)
}
