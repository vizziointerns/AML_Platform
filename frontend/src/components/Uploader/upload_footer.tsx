import { UploadCloud } from 'lucide-react'
import type { UploadFile } from './types'

export default function upload_footer({
	files,
	is_uploading,
	pending_count,
	on_close,
	on_start_upload,
	on_clear_all,
	text_muted,
	text_heading,
	border_subtle,
	bg_subtle
}: {
	files: UploadFile[]
	is_uploading: boolean
	pending_count: number
	on_close: () => void
	on_start_upload: () => void
	on_clear_all: () => void
	text_muted: string
	text_heading: string
	border_subtle: string
	bg_subtle: string
}) {
	const clear_class = files.length > 0 ? `${text_muted} hover:text-red-500` : 'opacity-0'

	return (
		<div
			className={`px-6 py-4 border-t ${border_subtle} shrink-0 ${bg_subtle} rounded-b-xl flex justify-between items-center`}
		>
			<button
				onClick={on_clear_all}
				className={`text-sm font-medium ${clear_class} transition-colors`}
			>
				Clear All
			</button>
			<div className="flex gap-3">
				<button
					onClick={on_close}
					className={`px-4 py-2.5 text-sm font-medium rounded-lg hover:${bg_subtle} transition-colors ${text_heading}`}
				>
					Cancel
				</button>
				<button
					onClick={on_start_upload}
					disabled={is_uploading || pending_count === 0}
					className={`px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
				>
					<UploadCloud size={16} />
					Start Upload {pending_count > 0 && `(${pending_count})`}
				</button>
			</div>
		</div>
	)
}
