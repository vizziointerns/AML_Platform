import { useState, useEffect, useRef } from 'react'
import { X, Minimize2, CheckCircle2 } from 'lucide-react'
import type { UploadFile } from './types'
import {
	render_file_item, render_minimized_widget, render_drag_drop_zone, render_upload_footer
} from './render'

export default function uploader({
	isOpen,
	on_close,
	is_dark_mode
}: {
	isOpen: boolean
	on_close: () => void
	is_dark_mode: boolean
}) {
	const [is_minimized, set_is_minimized] = useState(false)
	const [files, set_files] = useState<UploadFile[]>([])
	const [is_drag_active, set_is_drag_active] = useState(false)
	const [target_dataset, set_target_dataset] = useState('Urban_Vehicles_v4')
	const file_input_ref = useRef<HTMLInputElement | null>(undefined as unknown as HTMLInputElement | null)
	const folder_input_ref = useRef<HTMLInputElement | null>(undefined as unknown as HTMLInputElement | null)

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	const bg_drag = is_dark_mode ? 'bg-blue-500/5' : 'bg-blue-50'

	useEffect(() => {
		let interval: ReturnType<typeof setInterval>

		const active_uploads = files.filter((f) => f.status === 'uploading')

		if (active_uploads.length > 0) {
			interval = setInterval(() => {
				set_files((prev) =>
					prev.map((f) => {
						if (f.status !== 'uploading') return f

						if (f.progress > 40 && f.progress < 60 && Math.random() < 0.05 && !f.error) {
							return { ...f, status: 'error', error: 'Network timeout during chunk sequence.' }
						}

						const increment = Math.random() * 10 + 2
						const new_progress = Math.min(100, f.progress + increment)

						return {
							...f,
							progress: new_progress,
							status: new_progress === 100 ? 'success' : 'uploading',
							chunkProgress: {
								loaded: Math.floor((new_progress / 100) * f.size),
								total: f.size
							}
						}
					})
				)
			}, 500)
		}

		return () => clearInterval(interval)
	}, [files])

	const handle_drag_enter = (e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		set_is_drag_active(true)
	}
	const handle_drag_leave = (e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		set_is_drag_active(false)
	}
	const handle_drag_over = (e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
	}
	const handle_drop = (e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		set_is_drag_active(false)
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			process_files(Array.from(e.dataTransfer.files))
		}
	}

	const handle_file_change = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			process_files(Array.from(e.target.files))
		}
	}

	const process_files = (new_files: File[]) => {
		const processed: UploadFile[] = new_files.map((f) => {
			let preview_url
			const is_image = f.type.startsWith('image/')
			if (is_image) {
				preview_url = URL.createObjectURL(f)
			}

			return {
				id: Math.random().toString(36).substring(7),
				file: f,
				name: f.name,
				size: f.size,
				previewUrl: preview_url,
				progress: 0,
				status: is_image || f.name.endsWith('.zip') ? 'pending' : 'error',
				error: !is_image && !f.name.endsWith('.zip') ? 'Unsupported file format.' : undefined
			}
		})
		set_files((prev) => [...prev, ...processed])
	}

	const format_size = (bytes: number) => {
		if (bytes === 0) return '0 B'
		const k = 1024,
			sizes = ['B', 'KB', 'MB', 'GB'],
			i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
	}

	const start_upload = () => {
		set_files((prev) =>
			prev.map((f) => (f.status === 'pending' ? { ...f, status: 'uploading' } : f))
		)
	}
	const retry_upload = (id: string) => {
		set_files((prev) =>
			prev.map((f) => (f.id === id ? { ...f, status: 'uploading', error: undefined } : f))
		)
	}
	const remove_file = (id: string) => {
		set_files((prev) => {
			const new_files = prev.filter((f) => f.id !== id)
			const file_to_remove = prev.find((f) => f.id === id)
			if (file_to_remove?.previewUrl) URL.revokeObjectURL(file_to_remove.previewUrl)
			return new_files
		})
	}

	if (!isOpen) return undefined

	const total_files = files.length
	const completed_files = files.filter((f) => f.status === 'success').length
	const error_files = files.filter((f) => f.status === 'error').length
	const is_uploading = files.some((f) => f.status === 'uploading')

	if (is_minimized) {
		return render_minimized_widget(
			on_close, set_is_minimized, is_dark_mode, text_heading, text_muted,
			border_subtle, bg_card, bg_subtle, is_uploading, completed_files,
			total_files, error_files, files
		)
	}

	return (
		<>
			<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300" onClick={on_close} />
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
				<div
					className={`pointer-events-auto w-full max-w-3xl rounded-xl shadow-2xl border ${border_subtle} ${bg_card} flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 flex-shrink-0`}
					onClick={(e) => e.stopPropagation()}
				>
					<div className={`px-6 py-4 border-b ${border_subtle} flex justify-between items-center shrink-0`}>
						<div>
							<h2 className={`text-lg font-semibold tracking-tight ${text_heading}`}>Upload to Dataset</h2>
							<p className={`text-sm ${text_muted}`}>Drag images or folders to ingest into your active project.</p>
						</div>
						<div className="flex items-center gap-2 text-zinc-400">
							<button className={`p-2 rounded-md hover:${bg_subtle} transition-colors`} onClick={() => set_is_minimized(true)}>
								<Minimize2 size={18} />
							</button>
							<button className={`p-2 rounded-md hover:${bg_subtle} transition-colors`} onClick={on_close}>
								<X size={18} />
							</button>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto px-6 py-6 pb-2 space-y-6">
						<div className="flex items-center justify-between text-sm">
							<span className={`font-medium ${text_heading}`}>Target Dataset</span>
							<select
								value={target_dataset}
								onChange={(e) => set_target_dataset(e.target.value)}
								className={`px-3 py-1.5 rounded-lg border ${border_subtle} ${is_dark_mode ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-900'} outline-none focus:border-blue-500`}
							>
								<option value="Urban_Vehicles_v4">Urban_Vehicles_v4</option>
								<option value="Drone_Terrain_Maps">Drone_Terrain_Maps</option>
								<option value="Retail_Shelves_DB">Retail_Shelves_DB</option>
								<option value="New_Dataset">+ Create New Dataset</option>
							</select>
						</div>

						{render_drag_drop_zone(is_drag_active, is_dark_mode, bg_drag, bg_card, bg_subtle, border_subtle, text_heading, text_muted, file_input_ref, folder_input_ref, handle_drag_enter, handle_drag_over, handle_drag_leave, handle_drop, handle_file_change)}

						{files.length > 0 && (
							<div className="space-y-3">
								<div className="flex justify-between items-center">
									<h3 className={`text-sm font-medium ${text_heading}`}>Upload Queue ({files.length} items)</h3>
									{completed_files === total_files && total_files > 0 ? (
										<span className="text-xs font-medium text-emerald-500 flex items-center gap-1">
											<CheckCircle2 size={14} /> All complete
										</span>
									) : (
										<span className={`text-xs ${text_muted}`}>{completed_files} completed, {error_files} failed</span>
									)}
								</div>

								<div className={`rounded-xl border ${border_subtle} divide-y ${is_dark_mode ? 'divide-zinc-800' : 'divide-zinc-200'} overflow-hidden`}>
									{files.map((file) => (
										render_file_item(file, is_dark_mode, text_heading, text_muted, border_subtle, retry_upload, remove_file, format_size)
									))}
								</div>
							</div>
						)}
					</div>

					{render_upload_footer(files, is_uploading, completed_files, total_files, error_files, on_close, start_upload, set_files, text_muted, text_heading, border_subtle, bg_subtle)}
				</div>
			</div>
		</>
	)
}
