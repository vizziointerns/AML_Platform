import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Box, Plus, Search, Filter, Cpu } from 'lucide-react'
import { use_project_store } from '../../../../store/projectStore'

import { SUPPORTED_MODELS } from '../../../../constants/models'
import { update_project } from '../../../../api/projects'

export default function models_page({ is_dark_mode }: { is_dark_mode: boolean }) {
	const [search_query, set_search_query] = useState('')
	const [error, set_error] = useState<string | undefined>(undefined)
	const navigate = useNavigate()
	const { projectId: project_id } = useParams<{ projectId: string }>()
	const { updateProject: update_project_store } = use_project_store()

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'

	const handle_select_model = async (model: (typeof SUPPORTED_MODELS)[0]) => {
		if (!project_id) return
		set_error(undefined)

		try {
			await update_project(project_id, { task_type: model.task_type })

			update_project_store(project_id, { task_type: model.task_type })

			navigate(`/projects/${project_id}/training`)
		} catch (err) {
			console.error('Failed to update task type', err)
			set_error(err instanceof Error ? err.message : 'Failed to update task type')
		}
	}

	const filtered = SUPPORTED_MODELS.filter(
		(m) =>
			m.name.toLowerCase().includes(search_query.toLowerCase()) ||
			m.task_type.toLowerCase().includes(search_query.toLowerCase())
	)

	const status_color = (status: string) => {
		switch (status) {
			case 'Available':
				return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
			default:
				return 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
		}
	}

	return (
		<div className="page-layout">
			<div className="page-content">
				<div className="page-header">
					<div>
						<h1 className={`text-2xl font-semibold tracking-tight ${text_heading}`}>Models</h1>
						<p className={`text-sm mt-1 ${text_muted}`}>Manage trained models and versions.</p>
					</div>
					<div className="flex gap-2">
						<button className="btn-primary">
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

				{error && (
					<div
						className={`px-4 py-3 rounded-lg text-sm text-red-500 ${is_dark_mode ? 'bg-red-500/10' : 'bg-red-50'}`}
					>
						{error}
					</div>
				)}
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
								</div>
								<div className={`flex flex-wrap gap-4 text-xs ${text_muted} mb-3`}>
									<span
										className={`flex items-center gap-1.5 font-medium ${is_dark_mode ? 'text-blue-400' : 'text-blue-600'}`}
									>
										<Cpu size={14} /> {model.task_type}
									</span>
								</div>
								<p className={`text-sm ${text_muted} mb-4 min-h-[40px] line-clamp-2`}>
									{model.description}
								</p>
								<div className="flex items-center justify-end pt-3 border-t border-zinc-800/20">
									<button
										onClick={(e) => {
											e.preventDefault()
											handle_select_model(model)
										}}
										className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
									>
										Select Model
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
