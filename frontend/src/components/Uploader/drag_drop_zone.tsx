import { UploadCloud } from 'lucide-react'

export default function drag_drop_zone({
	is_drag_active,
	is_dark_mode,
	bg_drag,
	text_heading,
	text_muted,
	folder_only = false
}: {
	is_drag_active: boolean
	is_dark_mode: boolean
	bg_drag: string
	text_heading: string
	text_muted: string
	folder_only?: boolean
	accept_images_only?: boolean
}) {
	const drag_bg = is_drag_active
		? `border-blue-500 ${bg_drag}`
		: `${is_dark_mode ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-300 bg-zinc-50'}`

	return (
		<div
			className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${drag_bg}`}
		>
			<div
				className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
					is_drag_active
						? 'bg-blue-500/20 text-blue-500'
						: is_dark_mode
							? 'bg-zinc-800 text-zinc-400'
							: 'bg-zinc-200 text-zinc-500'
				}`}
			>
				<UploadCloud size={32} />
			</div>

			<h3 className={`text-lg font-medium mb-1 ${text_heading}`}>
				{folder_only ? 'Drop a folder here' : 'Drop files or a folder here'}
			</h3>
			<p className={`text-sm ${text_muted} max-w-[300px]`}>
				{folder_only
					? 'Imports JPG, PNG, WEBP, or TIFF images. Folder hierarchy is preserved.'
					: 'Supports JPG, PNG, WEBP, TIFF, or ZIP archives. Folders preserve hierarchy.'}
			</p>
		</div>
	)
}
