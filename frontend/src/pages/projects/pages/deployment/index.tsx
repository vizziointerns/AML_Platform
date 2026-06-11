import { useState } from 'react'
import {
	Rocket,
	Globe,
	Server,
	Smartphone,
	Plus,
	Search,
	Filter,
	MoreVertical,
	CheckCircle2,
	Clock,
	AlertCircle,
	Cpu
} from 'lucide-react'

interface DeploymentInfo {
	id: number
	name: string
	model: string
	version: string
	environment: string
	status: string
	endpoint: string
	requests: string
	updated: string
}

const MOCK_DEPLOYMENTS: DeploymentInfo[] = [
	{
		id: 1,
		name: 'Production API',
		model: 'YOLOv8 Detection',
		version: 'v2.1.0',
		environment: 'Production',
		status: 'Active',
		endpoint: 'https://api.example.com/v1/detect',
		requests: '12.4k/day',
		updated: '2 hrs ago'
	},
	{
		id: 2,
		name: 'Staging Server',
		model: 'ResNet-50 Classifier',
		version: 'v1.4.0',
		environment: 'Staging',
		status: 'Active',
		endpoint: 'https://staging.example.com/v1/classify',
		requests: '1.2k/day',
		updated: '1 day ago'
	},
	{
		id: 3,
		name: 'Edge Device Alpha',
		model: 'EfficientDet D2',
		version: 'v3.0.0',
		environment: 'Edge',
		status: 'Active',
		endpoint: 'edge://device-alpha/infer',
		requests: '8.7k/day',
		updated: '3 days ago'
	},
	{
		id: 4,
		name: 'Mobile SDK Build',
		model: 'YOLOv8 Detection',
		version: 'v2.0.0',
		environment: 'Mobile',
		status: 'Pending',
		endpoint: '-',
		requests: '-',
		updated: '1 week ago'
	},
	{
		id: 5,
		name: 'Canary Test B',
		model: 'SegFormer B3',
		version: 'v0.9.0',
		environment: 'Production',
		status: 'Failed',
		endpoint: 'https://canary-b.example.com/v1/segment',
		requests: '0',
		updated: '2 weeks ago'
	}
]

export default function deployment_page({ is_dark_mode }: { is_dark_mode: boolean }) {
	const [search_query, set_search_query] = useState('')

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'

	const filtered = MOCK_DEPLOYMENTS.filter((d) =>
		d.name.toLowerCase().includes(search_query.toLowerCase())
	)

	const env_icon = (env: string) => {
		switch (env) {
			case 'Production':
				return <Globe size={16} className="text-blue-500" />
			case 'Staging':
				return <Server size={16} className="text-amber-500" />
			case 'Edge':
				return <Cpu size={16} className="text-purple-500" />
			case 'Mobile':
				return <Smartphone size={16} className="text-emerald-500" />
			default:
				return <Rocket size={16} className="text-zinc-500" />
		}
	}

	const status_icon = (status: string) => {
		switch (status) {
			case 'Active':
				return (
					<div className="flex items-center gap-1.5 text-emerald-500 text-xs font-medium">
						<CheckCircle2 size={14} /> Active
					</div>
				)
			case 'Pending':
				return (
					<div className="flex items-center gap-1.5 text-amber-500 text-xs font-medium">
						<Clock size={14} /> Pending
					</div>
				)
			case 'Failed':
				return (
					<div className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
						<AlertCircle size={14} /> Failed
					</div>
				)
			default:
				return <div className="text-xs text-zinc-500">{status}</div>
		}
	}

	return (
		<div className="page-layout">
			<div className="page-content">
				<div className="page-header">
					<div>
						<h1 className={`text-2xl font-semibold tracking-tight ${text_heading}`}>Deployment</h1>
						<p className={`text-sm mt-1 ${text_muted}`}>
							Manage model deployments across environments.
						</p>
					</div>
					<button className="btn-primary">
						<Plus size={16} /> New Deployment
					</button>
				</div>

				<div className="flex flex-col sm:flex-row justify-between gap-4">
					<div
						className={`flex items-center px-3 py-2 rounded-lg border ${border_subtle} ${bg_card} w-full sm:w-80`}
					>
						<Search size={16} className={text_muted} />
						<input
							type="text"
							placeholder="Search deployments..."
							className={`bg-transparent border-none outline-none text-sm ml-2 w-full ${is_dark_mode ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}`}
							value={search_query}
							onChange={(e) => set_search_query(e.target.value)}
						/>
					</div>
					<button
						className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${is_dark_mode ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
					>
						<Filter size={16} /> Filter
					</button>
				</div>

				<div className={`rounded-xl border ${border_subtle} ${bg_card} overflow-hidden`}>
					<table className="w-full text-sm text-left">
						<thead
							className={`text-xs uppercase ${bg_subtle} ${text_muted} border-b ${border_subtle}`}
						>
							<tr>
								<th className="px-6 py-4 font-medium">Deployment</th>
								<th className="px-6 py-4 font-medium">Model</th>
								<th className="px-6 py-4 font-medium">Environment</th>
								<th className="px-6 py-4 font-medium">Status</th>
								<th className="px-6 py-4 font-medium hidden lg:table-cell">Requests</th>
								<th className="px-6 py-4 font-medium">Updated</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-zinc-800/20">
							{filtered.map((dep) => (
								<tr
									key={dep.id}
									className={`hover:${bg_subtle} transition-colors cursor-pointer group`}
								>
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											<div
												className={`p-2 rounded-lg ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'}`}
											>
												<Rocket
													size={16}
													className={is_dark_mode ? 'text-zinc-400' : 'text-zinc-600'}
												/>
											</div>
											<div>
												<div className={`font-medium ${text_heading}`}>{dep.name}</div>
												<div className={`text-xs ${text_muted}`}>{dep.endpoint}</div>
											</div>
										</div>
									</td>
									<td className={`px-6 py-4 ${text_heading}`}>
										<div>{dep.model}</div>
										<div className={`text-xs ${text_muted}`}>{dep.version}</div>
									</td>
									<td className="px-6 py-4">
										<div className="flex items-center gap-2">
											{env_icon(dep.environment)}
											<span className={`text-xs font-medium ${text_heading}`}>
												{dep.environment}
											</span>
										</div>
									</td>
									<td className="px-6 py-4">{status_icon(dep.status)}</td>
									<td className={`px-6 py-4 hidden lg:table-cell ${text_muted}`}>{dep.requests}</td>
									<td className={`px-6 py-4 ${text_muted} flex items-center gap-2`}>
										{dep.updated}
										<MoreVertical
											size={14}
											className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400"
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	)
}
