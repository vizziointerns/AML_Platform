import { useState } from 'react'
import { X, Upload } from 'lucide-react'

interface Props {
	is_dark_mode: boolean
	on_image_select: (file: File | undefined) => void
	preview_url?: string
}

export default function cover_image_uploader({
	is_dark_mode,
	on_image_select,
	preview_url
}: Props) {
	const [preview, set_preview] = useState(preview_url ?? '')
	const [error, set_error] = useState('')
	const [input_el, set_input_el] = useState<HTMLInputElement | undefined>()
	const input_ref = (el: HTMLInputElement | null) => {
		set_input_el(el ?? undefined)
	}

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'

	function handle_file_select(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return

		const allowed = ['image/jpeg', 'image/png', 'image/webp']
		if (!allowed.includes(file.type)) {
			set_error('Only .jpg, .png, and .webp files are accepted.')
			set_preview('')
			on_image_select(undefined)
			return
		}

		if (file.size > 5 * 1024 * 1024) {
			set_error('File must be under 5 MB.')
			set_preview('')
			on_image_select(undefined)
			return
		}

		set_error('')
		set_preview(URL.createObjectURL(file))
		on_image_select(file)
	}

	function handle_remove() {
		set_preview('')
		set_error('')
		on_image_select(undefined)
		if (input_el) {
			input_el.value = ''
		}
	}

	return (
		<div className="space-y-1.5">
			<label className={`text-sm font-medium ${text_heading}`}>Cover Image (optional)</label>

			{preview ? (
				<div className={`relative w-full h-32 rounded-lg overflow-hidden border ${border_subtle}`}>
					<img src={preview} alt="Cover preview" className="w-full h-full object-cover" />
					<button
						type="button"
						onClick={handle_remove}
						className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
						aria-label="Remove cover image"
					>
						<X size={14} />
					</button>
				</div>
			) : (
				<label
					className={`flex items-center justify-center gap-2 w-full h-20 rounded-lg border-2 border-dashed ${border_subtle} ${bg_subtle} cursor-pointer hover:opacity-80 transition-opacity`}
				>
					<Upload size={16} className={text_muted} />
					<span className={`text-sm ${text_muted}`}>Click to upload cover image</span>
					<input
						ref={input_ref}
						type="file"
						aria-label="Upload cover image"
						accept=".jpg,.jpeg,.png,.webp"
						className="hidden"
						onChange={handle_file_select}
					/>
				</label>
			)}

			{error && <p className="text-xs text-red-500">{error}</p>}
		</div>
	)
}
