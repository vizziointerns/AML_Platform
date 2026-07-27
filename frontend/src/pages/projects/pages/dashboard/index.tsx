import { useState } from 'react'
import { ImageIcon, PenTool, Download, Database, Tags, HardDrive } from 'lucide-react'
import type { Project } from '../../../../store/projectStore'
import { use_project_stats } from '../../../../hooks/use_project_stats'
import type { ProjectStats } from '../../../../hooks/use_project_stats'
import { stat_card } from '../../../../components/dashboard/stat_card'
import { progress_card } from '../../../../components/dashboard/progress_card'
import { quick_actions_card } from '../../../../components/dashboard/quick_actions_card'
import { team_members_card } from '../../../../components/dashboard/team_members_card'
import { CreateDatasetDialog } from '../../../../components/datasets/create_dataset_dialog'
import type { ActionItem } from '../../../../components/dashboard/quick_actions_card'
import { useNavigate } from 'react-router-dom'
import { useParams } from 'react-router-dom'

function render_skeleton_grid(is_dark_mode: boolean) {
	const card_cls = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'
	const pulse_cls = is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{[...Array(4)].map((_, i) => (
				<div key={i} className={`p-5 rounded-xl border ${card_cls}`}>
					<div className={`h-4 w-20 rounded animate-pulse mb-3 ${pulse_cls}`} />
					<div className={`h-8 w-16 rounded animate-pulse ${pulse_cls}`} />
				</div>
			))}
		</div>
	)
}

function render_stats_grid(
	stats: ProjectStats | undefined,
	project: Project,
	is_dark_mode: boolean
) {
	const storage_gb = stats ? (stats.storage_bytes / (1024 * 1024 * 1024)).toFixed(1) : '0.0'
	const total_images = (stats?.total_images ?? project.datasetCount ?? 0).toLocaleString()
	const annotation_progress = stats?.annotation_progress ?? 0
	const has_stats = stats !== undefined
	const total_datasets = has_stats ? stats.total_datasets.toLocaleString() : '0'
	const total_classes = has_stats ? stats.total_classes.toLocaleString() : '0'
	const total_annotations = has_stats ? stats.total_annotations.toLocaleString() : '0'

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{stat_card({
				label: 'Images',
				value: total_images,
				icon: ImageIcon,
				is_dark_mode
			})}
			{progress_card({
				label: 'Annotation Progress',
				value: annotation_progress,
				is_dark_mode
			})}
			{stat_card({
				label: 'Datasets',
				value: total_datasets,
				icon: Database,
				is_dark_mode
			})}
			{stat_card({
				label: 'Classes',
				value: total_classes,
				icon: Tags,
				is_dark_mode
			})}
			{stat_card({
				label: 'Annotations',
				value: total_annotations,
				icon: PenTool,
				is_dark_mode
			})}
			{stat_card({ label: 'Project Type', value: project.type, is_dark_mode })}
			{stat_card({
				label: 'Members',
				value: project.members.length,
				icon: ImageIcon,
				is_dark_mode
			})}
			{stat_card({
				label: 'Storage Used',
				value: `${storage_gb} GB`,
				icon: HardDrive,
				is_dark_mode
			})}
		</div>
	)
}

export function project_dashboard({
	project,
	is_dark_mode
}: {
	project: Project
	is_dark_mode: boolean
}) {
	const { projectId: project_id } = useParams()
	const navigate = useNavigate()
	const { stats, is_loading, error } = use_project_stats(project_id)
	const [is_create_dialog_open, set_is_create_dialog_open] = useState(false)

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'

	const actions: ActionItem[] = [
		{
			label: 'Create Datasets',
			icon: Database,
			on_click: () => set_is_create_dialog_open(true),
			variant: 'primary'
		},
		{
			label: 'Start Annotation',
			icon: PenTool,
			on_click: () => {
				if (project_id) navigate(`/projects/${project_id}/annotation`)
			}
		},
		{
			label: 'Export Dataset',
			icon: Download,
			on_click: () => {}
		}
	]

	return (
		<div className="page-layout">
			<div className="page-content">
				<div className="page-header mb-8">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
						<p className={`text-sm mt-1 ${text_muted}`}>
							{project.name} — project overview and statistics.
						</p>
					</div>
				</div>

				{error ? (
					<div
						className={`p-6 rounded-xl border text-center ${is_dark_mode ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}
					>
						<p className="text-sm font-medium">Failed to load stats: {error}</p>
					</div>
				) : is_loading ? (
					render_skeleton_grid(is_dark_mode)
				) : (
					render_stats_grid(stats, project, is_dark_mode)
				)}

				{quick_actions_card({ actions, is_dark_mode })}

				{team_members_card({ members: project.members, is_dark_mode })}

			<CreateDatasetDialog
				is_open={is_create_dialog_open}
				on_close={() => set_is_create_dialog_open(false)}
				project_id={project_id}
				is_dark_mode={is_dark_mode}
				on_created={() => {
					window.dispatchEvent(new CustomEvent('datasets-changed'))
					if (project_id) navigate(`/projects/${project_id}/datasets`)
				}}
			/>
			</div>
		</div>
	)
}
