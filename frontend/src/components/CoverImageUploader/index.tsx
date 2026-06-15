import { useState, useCallback, useRef } from 'react'
import { X, Upload, Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '../../utils/supabase'

interface CoverImageUploaderProps {
	project_id: string
	current_url: string | undefined
	is_dark_mode: boolean
	on_save: (url: string | undefined) => Promise<void>
	on_close: () => void
}

export function cover_image_uploader({
	project_id,
	current_url,
	is_dark_mode,
	on_save,
	on_close
}: CoverImageUploaderProps) {
	const [selected_file, set_selected_file] = useState<File | undefined>(undefined)
	const [preview_url, set_preview_url] = useState<string | undefined>(undefined)
	const [is_uploading, set_is_uploading] = useState(false)
	const [error, set_error] = useState<string | undefined>(undefined)
	const file_input_ref = useRef<HTMLInputElement>(undefined!)

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const bg_card = is_dark_mode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
	const overlay_bg = is_dark_mode ? 'bg-black/60' : 'bg-black/40'
	const border_subtle = is_dark_mode ? 'border-zinc-700' : 'border-zinc-200'
	const btn_border = is_dark_mode
		? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
		: 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'

	const handle_file_select = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		const valid_types = ['image/jpeg', 'image/png', 'image/webp']
		if (!valid_types.includes(file.type)) {
			set_error('Only .jpg, .png, and .webp files are supported.')
			return
		}

		if (file.size > 5 * 1024 * 1024) {
			set_error('File size must be under 5 MB.')
			return
		}

		set_error(undefined)
		set_selected_file(file)
		set_preview_url(URL.createObjectURL(file))
	}, [])

	const handle_upload = useCallback(async () => {
		if (!selected_file) return

		set_is_uploading(true)
		set_error(undefined)

		try {
			const ext = selected_file.name.split('.').pop() ?? 'png'
			const file_name = `${crypto.randomUUID()}.${ext}`
			const file_path = `${project_id}/${file_name}`

			const { error: upload_error } = await supabase.storage
				.from('project-covers')
				.upload(file_path, selected_file, {
					cacheControl: '3600',
					upsert: true
				})

			if (upload_error) {
				set_error(`Upload failed: ${upload_error.message}`)
				set_is_uploading(false)
				return
			}

			const { data: url_data } = supabase.storage.from('project-covers').getPublicUrl(file_path)
			const public_url = url_data.publicUrl

			await on_save(public_url)
			on_close()
		} catch {
			set_error('An unexpected error occurred during upload.')
			set_is_uploading(false)
		}
	}, [selected_file, project_id, on_save, on_close])

	const handle_remove = useCallback(async () => {
		set_is_uploading(true)
		set_error(undefined)
		try {
			await on_save(undefined)
			on_close()
		} catch {
			set_error('Failed to remove cover image.')
			set_is_uploading(false)
		}
	}, [on_save, on_close])

	const preview = preview_url ?? current_url

	const render_preview = () => (
		<div
			className={`w-full h-40 rounded-lg border ${border_subtle} flex items-center justify-center overflow-hidden ${is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}
		>
			{preview ? (
				<img src={preview} alt="Cover" className="w-full h-full object-cover" />
			) : (
				<div className={`text-center ${text_muted}`}>
					<Upload size={32} className="mx-auto mb-2 opacity-50" />
					<p className="text-xs">No cover image selected</p>
				</div>
			)}
		</div>
	)

	const render_actions = () => (
		<div className="flex items-center gap-3">
			<button
				onClick={() => file_input_ref.current?.click()}
				disabled={is_uploading}
				className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
			>
				<Upload size={16} />
				{selected_file ? 'Choose Different' : 'Select Image'}
			</button>
			{current_url && (
				<button
					onClick={handle_remove}
					disabled={is_uploading}
					className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border ${btn_border} transition-colors disabled:opacity-50`}
				>
					<Trash2 size={16} />
					Remove
				</button>
			)}
		</div>
	)

	const render_footer = () => (
		<div className="flex justify-end gap-3 pt-2">
			<button
				onClick={on_close}
				disabled={is_uploading}
				className={`px-4 py-2 text-sm font-medium rounded-lg border ${btn_border} transition-colors disabled:opacity-50`}
			>
				Cancel
			</button>
			<button
				onClick={handle_upload}
				disabled={!selected_file || is_uploading}
				className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
			>
				{is_uploading ? (
					<>
						<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
						Uploading...
					</>
				) : (
					'Save'
				)}
			</button>
		</div>
	)

	return (
		<div
			className={`fixed inset-0 ${overlay_bg} flex items-center justify-center z-50`}
			onClick={on_close}
		>
			<div
				className={`w-full max-w-md rounded-xl border p-6 space-y-5 ${bg_card}`}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between">
					<h3 className={`font-semibold ${text_heading}`}>Project Cover Image</h3>
					<button
						onClick={on_close}
						className={`p-1 rounded-md ${is_dark_mode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'} ${text_muted}`}
					>
						<X size={18} />
					</button>
				</div>

				{render_preview()}

				{error && (
					<div
						className={`flex items-center gap-2 text-xs text-red-500 ${is_dark_mode ? 'bg-red-500/10' : 'bg-red-50'} px-3 py-2 rounded-lg`}
					>
						<AlertTriangle size={14} />
						{error}
					</div>
				)}

				<input
					ref={file_input_ref}
					type="file"
					accept=".jpg,.jpeg,.png,.webp"
					className="hidden"
					onChange={handle_file_select}
				/>

				{render_actions()}
				{render_footer()}
			</div>
		</div>
	)
}
