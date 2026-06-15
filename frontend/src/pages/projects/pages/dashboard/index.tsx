import { useState, useCallback } from 'react'
import { ImageIcon, PenTool, Download, Database, Tags, HardDrive, Trash2 } from 'lucide-react'
import type { Project } from '../../../../store/projectStore'
import { use_project_store } from '../../../../store/projectStore'
import { use_project_stats } from '../../../../hooks/use_project_stats'
import type { ProjectStats } from '../../../../hooks/use_project_stats'
import { stat_card } from '../../../../components/dashboard/stat_card'
import { progress_card } from '../../../../components/dashboard/progress_card'
import { quick_actions_card } from '../../../../components/dashboard/quick_actions_card'
import { team_members_card } from '../../../../components/dashboard/team_members_card'
import type { ActionItem } from '../../../../components/dashboard/quick_actions_card'
import { pin_button as PinButton } from '../../../../components/RecentProjectCard/PinButton'
import { duplicate_button as DuplicateButton } from '../../../../components/RecentProjectCard/DuplicateButton'
import { delete_modal as DeleteModal } from '../../../../components/RecentProjectCard/DeleteModal'
import { useNavigate } from 'react-router-dom'
import { useParams } from 'react-router-dom'

function dispatch_toast(message: string, type: 'success' | 'error' = 'success') {
	window.dispatchEvent(new CustomEvent('project-toast', { detail: { message, type } }))
}

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

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{stat_card({
				label: 'Images',
				value: (stats?.total_images ?? project.datasetCount ?? 0).toLocaleString(),
				icon: ImageIcon,
				is_dark_mode
			})}
			{progress_card({
				label: 'Annotation Progress',
				value: project.annotationProgress ?? 0,
				is_dark_mode
			})}
			{stat_card({
				label: 'Datasets',
				value: stats?.total_datasets?.toLocaleString() ?? '0',
				icon: Database,
				is_dark_mode
			})}
			{stat_card({
				label: 'Classes',
				value: stats?.total_classes?.toLocaleString() ?? '0',
				icon: Tags,
				is_dark_mode
			})}
			{stat_card({
				label: 'Annotations',
				value: stats?.total_annotations?.toLocaleString() ?? '0',
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
	is_dark_mode,
	on_open_uploader
}: {
	project: Project
	is_dark_mode: boolean
	on_open_uploader: () => void
}) {
	const { projectId: project_id } = useParams()
	const navigate = useNavigate()
	const { stats, is_loading, error } = use_project_stats(project_id)

	const toggle_pin = use_project_store((s) => s.togglePin)
	const delete_project = use_project_store((s) => s.deleteProject)
	const duplicate_project = use_project_store((s) => s.duplicateProject)

	const [delete_target, set_delete_target] = useState<{ id: string; name: string } | undefined>(
		undefined
	)
	const [is_deleting, set_is_deleting] = useState(false)

	const handle_pin = useCallback(async () => {
		try {
			await toggle_pin(project.id)
		} catch {
			dispatch_toast('Failed to update pin status. Please try again.', 'error')
		}
	}, [project.id, toggle_pin])

	const handle_delete = useCallback(async () => {
		if (!delete_target) return
		set_is_deleting(true)
		try {
			await delete_project(delete_target.id)
			set_delete_target(undefined)
			navigate('/projects')
		} catch {
			dispatch_toast('Failed to delete project. Please try again.', 'error')
		} finally {
			set_is_deleting(false)
		}
	}, [delete_target, delete_project, navigate])

	const handle_duplicate = useCallback(async () => {
		try {
			await duplicate_project(project.id)
			dispatch_toast('Project duplicated successfully.', 'success')
		} catch {
			dispatch_toast('Failed to duplicate project. Please try again.', 'error')
		}
	}, [project.id, duplicate_project])

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'

	const actions: ActionItem[] = [
		{
			label: 'Upload Data',
			icon: ImageIcon,
			on_click: on_open_uploader,
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
						<div className="flex items-center gap-3">
							<h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
							<PinButton
								is_pinned={project.isPinned}
								is_dark_mode={is_dark_mode}
								on_toggle={handle_pin}
							/>
						</div>
						<p className={`text-sm mt-1 ${text_muted}`}>
							{project.name} — project overview and statistics.
						</p>
					</div>
					<div className="flex gap-2">
						<DuplicateButton
							project_id={project.id}
							on_duplicate={handle_duplicate}
							is_dark_mode={is_dark_mode}
						/>
						<button
							onClick={() => set_delete_target({ id: project.id, name: project.name })}
							className={`p-2 rounded-md ${text_muted} hover:text-red-500 ${is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} transition-colors`}
							title="Delete project"
						>
							<Trash2 size={16} />
						</button>
						<button
							onClick={on_open_uploader}
							className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm transition-colors"
						>
							Upload Data
						</button>
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

				{delete_target && (
					<DeleteModal
						project_name={delete_target.name}
						is_dark_mode={is_dark_mode}
						is_loading={is_deleting}
						on_confirm={handle_delete}
						on_cancel={() => set_delete_target(undefined)}
					/>
				)}
			</div>
		</div>
	)
}
