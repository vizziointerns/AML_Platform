import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Image, Pin, Clock, MoreVertical, Edit3, Copy, Upload, Trash2 } from 'lucide-react'
import type { Project } from '../../store/projectStore'
import { extract_dominant_color } from '../../utils/color_extract'

interface ProjectCardProps {
	project: Project
	is_dark_mode: boolean
	on_pin_toggle: (id: string) => void
	on_rename: (id: string, name: string) => void
	on_duplicate: (id: string) => void
	on_delete: (id: string, name: string) => void
	on_upload_cover?: (id: string, file: File) => void
	on_remove_cover?: (id: string) => void
}

function to_rgba(color: string, alpha: number): string {
	return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
}

function render_cover_section(
	project: Project,
	is_dark_mode: boolean,
	accent_color: string,
	text_muted: string,
	border_subtle: string
) {
	const bg_placeholder = is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'
	return (
		<div className="relative h-44 overflow-hidden">
			{project.coverImageUrl ? (
				<>
					<img
						src={project.coverImageUrl}
						alt={project.name}
						className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
					/>
					<div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-transparent pointer-events-none" />
				</>
			) : (
				<div className={`h-full flex items-center justify-center ${bg_placeholder}`}>
					<Image size={36} className={text_muted} />
				</div>
			)}
			<div
				className={`absolute inset-x-0 bottom-0 h-px ${accent_color ? '' : border_subtle}`}
				style={accent_color ? { backgroundColor: to_rgba(accent_color, 0.15) } : undefined}
			/>
		</div>
	)
}

function render_kebab_menu(
	is_menu_open: boolean,
	set_is_menu_open: (v: boolean) => void,
	project: Project,
	file_input_el: HTMLInputElement | undefined,
	on_rename: (id: string, name: string) => void,
	on_duplicate: (id: string) => void,
	on_delete: (id: string, name: string) => void,
	on_remove_cover: ((id: string) => void) | undefined,
	border_subtle: string,
	bg_card: string,
	bg_subtle: string,
	text_heading: string
) {
	if (!is_menu_open) return undefined

	return (
		<div
			className={`absolute right-0 bottom-full mb-1 w-44 rounded-lg border ${border_subtle} ${bg_card} shadow-xl z-10 py-1`}
			onClick={(e) => e.stopPropagation()}
		>
			{project.coverImageUrl ? (
				<>
					<button
						onClick={() => {
							set_is_menu_open(false)
							file_input_el?.click()
						}}
						className={`w-full text-left px-3 py-2 text-sm hover:${bg_subtle} ${text_heading} flex items-center gap-2`}
					>
						<Upload size={14} /> Replace Cover Photo
					</button>
					<button
						onClick={() => {
							set_is_menu_open(false)
							on_remove_cover?.(project.id)
						}}
						className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
					>
						<Trash2 size={14} /> Remove Cover Photo
					</button>
					<div className={`border-t ${border_subtle} my-1`} />
				</>
			) : (
				<button
					onClick={() => {
						set_is_menu_open(false)
						file_input_el?.click()
					}}
					className={`w-full text-left px-3 py-2 text-sm hover:${bg_subtle} ${text_heading} flex items-center gap-2`}
				>
					<Upload size={14} /> Upload Cover Photo
				</button>
			)}
			<button
				onClick={() => {
					set_is_menu_open(false)
					on_rename(project.id, project.name)
				}}
				className={`w-full text-left px-3 py-2 text-sm hover:${bg_subtle} ${text_heading} flex items-center gap-2`}
			>
				<Edit3 size={14} /> Rename
			</button>
			<button
				onClick={() => {
					set_is_menu_open(false)
					on_duplicate(project.id)
				}}
				className={`w-full text-left px-3 py-2 text-sm hover:${bg_subtle} ${text_heading} flex items-center gap-2`}
			>
				<Copy size={14} /> Duplicate
			</button>
			<button
				onClick={() => {
					set_is_menu_open(false)
					on_delete(project.id, project.name)
				}}
				className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
			>
				<Trash2 size={14} /> Delete
			</button>
		</div>
	)
}

export default function project_card({
	project,
	is_dark_mode,
	on_pin_toggle,
	on_rename,
	on_duplicate,
	on_delete,
	on_upload_cover,
	on_remove_cover
}: ProjectCardProps) {
	const [is_menu_open, set_is_menu_open] = useState(false)
	const [is_hovered, set_is_hovered] = useState(false)
	const [accent_color, set_accent_color] = useState('')
	const [file_input_el, set_file_input_el] = useState<HTMLInputElement | undefined>()
	const file_input_ref = (el: HTMLInputElement | null) => set_file_input_el(el ?? undefined)
	const mounted_ref = useRef(true)
	const navigate = useNavigate()

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-100'

	useEffect(() => {
		mounted_ref.current = true
		if (!project.coverImageUrl) {
			set_accent_color('')
			return
		}
		const cancel = extract_dominant_color(
			project.coverImageUrl,
			(color) => {
				if (mounted_ref.current) set_accent_color(color)
			},
			() => {
				if (mounted_ref.current) set_accent_color('')
			}
		)
		return () => {
			mounted_ref.current = false
			cancel()
		}
	}, [project.coverImageUrl])

	function handle_card_click() {
		navigate(`/projects/${project.id}/dashboard`)
	}

	function handle_file_selected(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file || !on_upload_cover) return
		on_upload_cover(project.id, file)
		e.target.value = ''
	}

	const border_color = accent_color
		? is_hovered
			? to_rgba(accent_color, 0.45)
			: to_rgba(accent_color, 0.2)
		: undefined

	const card_shadow = is_hovered ? ' -translate-y-0.5 shadow-xl' : ' shadow-md'

	const progress_bg = accent_color ? to_rgba(accent_color, 0.8) : '#3b82f6'

	return (
		<div
			onClick={handle_card_click}
			onMouseEnter={() => set_is_hovered(true)}
			onMouseLeave={() => set_is_hovered(false)}
			className={`rounded-xl border-2 ${border_subtle} ${bg_card} transition-all duration-300 relative cursor-pointer overflow-hidden group${card_shadow}`}
			style={border_color ? { borderColor: border_color } : undefined}
		>
			{render_cover_section(project, is_dark_mode, accent_color, text_muted, border_subtle)}

			<div className="p-4 space-y-3">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0">
						<h3 className={`text-sm font-semibold truncate ${text_heading}`}>{project.name}</h3>
						<p className={`text-xs truncate ${text_muted} mt-0.5`}>{project.type}</p>
					</div>
				</div>

				<div className="space-y-2">
					<div className="flex justify-between text-xs">
						<span className={text_muted}>{project.datasetCount} images</span>
						<span className={text_muted}>{project.annotationProgress}% annotated</span>
					</div>
					<div
						className={`h-1.5 rounded-full overflow-hidden ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
					>
						<div
							className="h-full rounded-full transition-all duration-500"
							style={{
								width: `${project.annotationProgress}%`,
								backgroundColor: progress_bg
							}}
						/>
					</div>
				</div>

				<div className={`flex items-center justify-between pt-3 border-t ${border_subtle}`}>
					<div className="flex items-center gap-2 text-xs">
						<Clock size={12} className={text_muted} />
						<span className={text_muted}>{new Date(project.lastUpdated).toLocaleDateString()}</span>
					</div>

					<div className="flex items-center gap-1">
						<button
							onClick={(e) => {
								e.stopPropagation()
								on_pin_toggle(project.id)
							}}
							title={project.isPinned ? 'Unpin project' : 'Pin project'}
							className={`p-1.5 rounded hover:${bg_subtle} ${project.isPinned ? 'text-yellow-500' : text_muted}`}
						>
							<Pin size={14} fill={project.isPinned ? 'currentColor' : 'none'} />
						</button>

						<div className="relative">
							<button
								onClick={(e) => {
									e.stopPropagation()
									set_is_menu_open(!is_menu_open)
								}}
								className={`p-1.5 rounded hover:${bg_subtle}`}
							>
								<MoreVertical size={14} className={text_muted} />
							</button>

							{render_kebab_menu(
								is_menu_open,
								set_is_menu_open,
								project,
								file_input_el,
								on_rename,
								on_duplicate,
								on_delete,
								on_remove_cover,
								border_subtle,
								bg_card,
								bg_subtle,
								text_heading
							)}
						</div>
					</div>
				</div>
			</div>

			<input
				ref={file_input_ref}
				type="file"
				accept=".jpg,.jpeg,.png,.webp"
				className="hidden"
				onChange={handle_file_selected}
				onClick={(e) => e.stopPropagation()}
			/>
		</div>
	)
}
