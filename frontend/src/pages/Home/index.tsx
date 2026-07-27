import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { use_dashboard_stats } from '../../hooks/use_dashboard_stats'
import { use_recent_projects } from '../../hooks/use_recent_projects'
import { use_activity_feed } from '../../hooks/use_activity_feed'
import { use_alerts } from '../../hooks/use_alerts'
import { recent_project_card as RecentProjectCard } from '../../components/RecentProjectCard'
import type { User } from '@supabase/supabase-js'
import { Plus, ChevronRight, Database } from 'lucide-react'
import { stats_grid } from './stats_grid'
import { alerts_widget } from './alerts_widget'
import { team_activity_widget } from './activity_widget'
import { use_project_store, type Project } from '../../store/projectStore'
import { supabase } from '../../utils/supabase'
import DeleteProjectDialog from '../../components/DeleteProjectDialog'
import { rename_dialog } from '../projects/rename_dialog'
import { convert_tiff_to_png, tiff_data_url_to_file } from '../../utils/tiff'

function toast_bar({
	toast,
	on_dismiss
}: {
	toast: { type: 'success' | 'error'; message: string }
	on_dismiss: () => void
}) {
	return (
		<div
			className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-in slide-in-from-bottom-4 duration-300 flex items-center gap-3 ${
				toast.type === 'success'
					? 'bg-emerald-900/90 border-emerald-700/50 text-emerald-200 backdrop-blur-sm'
					: 'bg-red-900/90 border-red-700/50 text-red-200 backdrop-blur-sm'
			}`}
			onClick={on_dismiss}
		>
			{toast.type === 'success' ? (
				<svg
					className="w-5 h-5 text-emerald-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
				</svg>
			) : (
				<svg
					className="w-5 h-5 text-red-400 shrink-0"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			)}
			{toast.message}
		</div>
	)
}

function greeting(name: string | undefined): string {
	const hour = new Date().getHours()
	const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
	const display_name = name?.split(' ')[0] ?? 'there'
	return `${period}, ${display_name}`
}

function project_card_skeleton({ is_dark_mode }: { is_dark_mode: boolean }) {
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'
	const skeleton_bg = is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'

	return (
		<div className={`rounded-xl border ${card_classes} p-4`}>
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-3">
					<div className={`w-10 h-10 rounded-lg animate-pulse ${skeleton_bg}`} />
					<div className="space-y-2">
						<div className={`h-4 w-28 rounded animate-pulse ${skeleton_bg}`} />
						<div className={`h-3 w-20 rounded animate-pulse ${skeleton_bg}`} />
					</div>
				</div>
				<div className={`h-5 w-14 rounded-full animate-pulse ${skeleton_bg}`} />
			</div>
			<div className="space-y-2">
				<div className="flex justify-between">
					<div className={`h-3 w-20 rounded animate-pulse ${skeleton_bg}`} />
					<div className={`h-3 w-16 rounded animate-pulse ${skeleton_bg}`} />
				</div>
				<div className={`h-1.5 rounded-full overflow-hidden ${skeleton_bg}`} />
			</div>
			<div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/50">
				<div className={`h-3 w-16 rounded animate-pulse ${skeleton_bg}`} />
				<div className="flex -space-x-1.5">
					{[...Array(3)].map((_, i) => (
						<div
							key={i}
							className={`w-5 h-5 rounded-full animate-pulse ${skeleton_bg} border-2 ${is_dark_mode ? 'border-zinc-900' : 'border-white'}`}
						/>
					))}
				</div>
			</div>
		</div>
	)
}

function recent_projects_section({
	recent,
	is_loading,
	error,
	is_dark_mode,
	text_muted,
	card_classes,
	on_open_new_project,
	on_navigate,
	menu_open,
	on_menu_toggle,
	on_rename,
	on_duplicate,
	on_add_cover,
	on_delete
}: {
	recent: Project[]
	is_loading: boolean
	error: string | undefined
	is_dark_mode: boolean
	text_muted: string
	card_classes: string
	on_open_new_project?: () => void
	on_navigate: (id: string) => void
	menu_open?: string | undefined
	on_menu_toggle?: (id: string | undefined) => void
	on_rename?: (p: Project) => void
	on_duplicate?: (id: string) => void
	on_add_cover?: (id: string) => void
	on_delete?: (p: Project) => void
}) {
	return (
		<div>
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-semibold tracking-tight">Recent Projects</h2>
				<button
					onClick={() => on_navigate('')}
					className="flex items-center gap-1 text-sm text-blue-500 font-medium hover:text-blue-400"
				>
					View All <ChevronRight size={14} />
				</button>
			</div>

			{is_loading ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{Array.from({ length: 4 }, (_, i) => (
						<div key={i}>{project_card_skeleton({ is_dark_mode })}</div>
					))}
				</div>
			) : error ? (
				<div className={`rounded-xl border ${card_classes} p-8 text-center`}>
					<p className="text-sm text-red-500">{error}</p>
				</div>
			) : recent.length === 0 ? (
				<div className={`rounded-xl border ${card_classes} p-8 text-center`}>
					<p className={`text-sm ${text_muted} mb-4`}>
						No projects yet. Create your first project to get started.
					</p>
					<button
						onClick={on_open_new_project}
						className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
					>
						<Plus size={16} /> Create Project
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{recent.map((project) => (
						<RecentProjectCard
							key={project.id}
							project={project}
							is_dark_mode={is_dark_mode}
							on_click={on_navigate}
							menu_open={menu_open}
							on_menu_toggle={on_menu_toggle}
							on_rename={on_rename}
							on_duplicate={on_duplicate}
							on_add_cover={on_add_cover}
							on_delete={on_delete}
						/>
					))}
				</div>
			)}
		</div>
	)
}

export default function home({
	user,
	is_dark_mode,
	on_open_uploader,
	on_open_new_project
}: {
	user: User | undefined
	is_dark_mode: boolean
	on_open_uploader?: () => void
	on_open_new_project?: () => void
}) {
	const navigate = useNavigate()
	const user_name = user?.user_metadata?.full_name as string | undefined
	const display_name = user_name ?? user?.email?.split('@')[0]
	const avatar_initials = user_name
		? user_name
				.split(' ')
				.map((s) => s[0])
				.join('')
				.toUpperCase()
				.slice(0, 2)
		: (user?.email?.[0]?.toUpperCase() ?? '?')

	const {
		stats,
		is_loading: is_stats_loading,
		is_refreshing,
		error: stats_error
	} = use_dashboard_stats()
	const {
		projects: recent,
		is_loading: is_projects_loading,
		error: projects_error
	} = use_recent_projects()
	const { items: activity_items, is_loading: is_activity_loading } = use_activity_feed()
	const { alerts, is_loading: is_alerts_loading } = use_alerts()

	const { duplicateProject: duplicate_project, updateProject: update_project } = use_project_store()

	const [menu_open, set_menu_open] = useState<string | undefined>(undefined)
	const [delete_target, set_delete_target] = useState<Project | undefined>(undefined)
	const [rename_target, set_rename_target] = useState<Project | undefined>(undefined)
	const [rename_name, set_rename_name] = useState('')
	const file_input_ref = useRef<HTMLInputElement>(undefined!)
	const cover_project_id = useRef<string | undefined>(undefined)

	const [toast, set_toast] = useState<{ type: 'success' | 'error'; message: string } | undefined>(
		undefined
	)

	useEffect(() => {
		if (!toast) return
		const timer = setTimeout(() => set_toast(undefined), 4000)
		return () => clearTimeout(timer)
	}, [toast])

	const show_toast = (message: string, type: 'success' | 'error' = 'success') => {
		set_toast({ type, message })
	}

	useEffect(() => {
		if (!menu_open) return
		const handler = () => set_menu_open(undefined)
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [menu_open])

	const handle_rename_open = (project: Project) => {
		set_rename_target(project)
		set_rename_name(project.name)
		set_menu_open(undefined)
	}

	const handle_rename_save = async () => {
		if (!rename_target || !rename_name.trim()) return
		const new_name = rename_name.trim()
		const { error: rename_err } = await supabase
			.from('projects')
			.update({ name: new_name })
			.eq('id', rename_target.id)
		if (rename_err) {
			show_toast(`Failed to rename: ${rename_err.message}`, 'error')
			return
		}
		update_project(rename_target.id, { name: new_name })
		set_rename_target(undefined)
		show_toast(`Project renamed to "${new_name}"`)
	}

	const handle_add_cover = (project_id: string) => {
		cover_project_id.current = project_id
		file_input_ref.current?.click()
	}

	const handle_cover_upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file || !cover_project_id.current) return
		const pid = cover_project_id.current
		let file_to_upload: File = file
		const is_tiff = /\.tiff?$/i.test(file.name)
		if (is_tiff) {
			try {
				const png_data_url = await convert_tiff_to_png(file)
				file_to_upload = await tiff_data_url_to_file(png_data_url, file.name)
			} catch {
				show_toast('Failed to convert TIFF cover to PNG', 'error')
				e.target.value = ''
				cover_project_id.current = undefined
				return
			}
		}
		const file_path = `${pid}/${Date.now()}-${file_to_upload.name}`
		const { error: upload_err } = await supabase.storage
			.from('project-covers')
			.upload(file_path, file_to_upload)
		if (upload_err) {
			show_toast(`Failed to upload cover: ${upload_err.message}`, 'error')
			e.target.value = ''
			cover_project_id.current = undefined
			return
		}
		const {
			data: { publicUrl: public_url }
		} = supabase.storage.from('project-covers').getPublicUrl(file_path)
		const { error: db_err } = await supabase
			.from('projects')
			.update({ thumbnail: public_url })
			.eq('id', pid)
		if (db_err) {
			show_toast(`Failed to save cover: ${db_err.message}`, 'error')
			e.target.value = ''
			cover_project_id.current = undefined
			return
		}
		update_project(pid, { thumbnail: public_url })
		show_toast('Cover photo added')
		e.target.value = ''
		cover_project_id.current = undefined
	}

	const handle_delete = (project: Project) => {
		set_delete_target(project)
		set_menu_open(undefined)
	}

	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'

	return (
		<div className="space-y-8">
			<div>
				<p className="text-lg font-medium">{greeting(display_name)}</p>
			</div>

			{stats_grid({
				stats,
				is_loading: is_stats_loading,
				error: stats_error,
				is_refreshing,
				is_dark_mode,
				text_muted
			})}

			{recent_projects_section({
				recent,
				is_loading: is_projects_loading,
				error: projects_error,
				is_dark_mode,
				text_muted,
				card_classes,
				on_open_new_project,
				on_navigate: (id) => navigate(id ? `/projects/${id}/dashboard` : '/projects'),
				menu_open,
				on_menu_toggle: set_menu_open,
				on_rename: handle_rename_open,
				on_duplicate: duplicate_project,
				on_add_cover: handle_add_cover,
				on_delete: handle_delete
			})}

			<div className={`rounded-xl border ${card_classes} p-5`}>
				<h3 className="font-semibold text-base tracking-tight mb-4">Quick Actions</h3>
				<div className="flex flex-wrap gap-3">
					<button
						onClick={on_open_new_project}
						className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
					>
						<Plus size={16} /> New Project
					</button>
					<button
						onClick={on_open_uploader}
						className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${is_dark_mode ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
					>
						<Database size={16} /> Upload Dataset
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{alerts_widget({
					alerts,
					is_loading: is_alerts_loading,
					is_dark_mode,
					card_classes
				})}
				{team_activity_widget({
					items: activity_items,
					is_loading: is_activity_loading,
					avatar_text: avatar_initials,
					is_dark_mode,
					text_muted,
					card_classes
				})}
			</div>

			<input
				type="file"
				ref={file_input_ref}
				accept="image/*,.tif,.tiff"
				onChange={handle_cover_upload}
				hidden
			/>

			{rename_dialog({
				target: rename_target,
				name: rename_name,
				on_name_change: set_rename_name,
				on_save: handle_rename_save,
				on_close: () => set_rename_target(undefined),
				is_dark_mode
			})}

			<DeleteProjectDialog
				delete_target={delete_target}
				on_close={() => set_delete_target(undefined)}
				on_success={(name) => show_toast(`"${name}" has been deleted.`)}
				is_dark_mode={is_dark_mode}
			/>

			{toast && toast_bar({ toast, on_dismiss: () => set_toast(undefined) })}
		</div>
	)
}
