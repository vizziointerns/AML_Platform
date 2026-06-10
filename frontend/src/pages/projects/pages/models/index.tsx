import { useState } from 'react'
import { Box, Plus, Search, Filter, Star, Clock, Cpu } from 'lucide-react'

interface ModelInfo {
	id: number
	name: string
	framework: string
	version: string
	map_score: number
	status: string
	updated: string
	is_favorited: boolean
}

const MOCK_MODELS: ModelInfo[] = [
	{
		id: 1,
		name: 'YOLOv8 Detection',
		framework: 'PyTorch',
		version: 'v2.1.0',
		map_score: 0.89,
		status: 'Deployed',
		updated: '2 days ago',
		is_favorited: true
	},
	{
		id: 2,
		name: 'ResNet-50 Classifier',
		framework: 'TensorFlow',
		version: 'v1.4.0',
		map_score: 0.82,
		status: 'Ready',
		updated: '1 week ago',
		is_favorited: false
	},
	{
		id: 3,
		name: 'SegFormer B3',
		framework: 'PyTorch',
		version: 'v0.9.0',
		map_score: 0.91,
		status: 'Training',
		updated: '3 hrs ago',
		is_favorited: true
	},
	{
		id: 4,
		name: 'EfficientDet D2',
		framework: 'TensorFlow',
		version: 'v3.0.0',
		map_score: 0.78,
		status: 'Ready',
		updated: '2 weeks ago',
		is_favorited: false
	},
	{
		id: 5,
		name: 'ViT Base Patch16',
		framework: 'JAX',
		version: 'v1.0.0',
		map_score: 0.85,
		status: 'Draft',
		updated: '1 month ago',
		is_favorited: false
	}
]

export default function models_page({ is_dark_mode }: { is_dark_mode: boolean }) {
	const [search_query, set_search_query] = useState('')

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'

	const filtered = MOCK_MODELS.filter((m) =>
		m.name.toLowerCase().includes(search_query.toLowerCase())
	)

	const status_color = (status: string) => {
		switch (status) {
			case 'Deployed':
				return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
			case 'Ready':
				return 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
			case 'Training':
				return 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
			default:
				return 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
		}
	}

	return (
		<div className="flex-1 overflow-y-auto p-4 lg:p-8">
			<div className="max-w-7xl mx-auto space-y-6">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h1 className={`text-2xl font-semibold tracking-tight ${text_heading}`}>Models</h1>
						<p className={`text-sm mt-1 ${text_muted}`}>Manage trained models and versions.</p>
					</div>
					<div className="flex gap-2">
						<button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm transition-colors">
							<Plus size={16} /> New Model
						</button>
					</div>
				</div>

				<div className="flex flex-col sm:flex-row justify-between gap-4">
					<div
						className={`flex items-center px-3 py-2 rounded-lg border ${border_subtle} ${bg_card} w-full sm:w-80`}
					>
						<Search size={16} className={text_muted} />
						<input
							type="text"
							placeholder="Search models..."
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

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filtered.map((model) => (
						<div
							key={model.id}
							className={`rounded-xl border ${border_subtle} ${bg_card} overflow-hidden hover:border-blue-500/50 hover:shadow-md transition-all group`}
						>
							<div
								className={`h-32 ${is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-100'} p-4 relative flex items-center justify-center`}
							>
								<Box
									size={40}
									className={`${is_dark_mode ? 'text-zinc-700' : 'text-zinc-300'} group-hover:scale-110 transition-transform duration-500`}
								/>
								<div className="absolute top-3 right-3">
									<span
										className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${status_color(model.status)}`}
									>
										{model.status}
									</span>
								</div>
							</div>
							<div className="p-5">
								<div className="flex justify-between items-start mb-2">
									<h3 className={`font-semibold tracking-tight truncate ${text_heading}`}>
										{model.name}
									</h3>
									<button
										className={`${model.is_favorited ? 'text-amber-500' : 'text-zinc-400'} hover:text-amber-500 shrink-0`}
									>
										<Star size={16} fill={model.is_favorited ? 'currentColor' : 'none'} />
									</button>
								</div>
								<div className={`flex flex-wrap gap-4 text-xs ${text_muted} mb-3`}>
									<span className="flex items-center gap-1.5">
										<Cpu size={14} /> {model.framework}
									</span>
									<span className="flex items-center gap-1.5">
										<Clock size={14} /> {model.updated}
									</span>
								</div>
								<div className="flex items-center justify-between pt-3 border-t border-zinc-800/20">
									<div>
										<span className={`text-xs ${text_muted}`}>mAP</span>
										<div className={`text-lg font-bold ${text_heading}`}>
											{(model.map_score * 100).toFixed(0)}%
										</div>
									</div>
									<button className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
										Deploy
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
