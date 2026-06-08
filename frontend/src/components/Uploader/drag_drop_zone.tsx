import { UploadCloud, Folder } from 'lucide-react'

export default function drag_drop_zone({
	is_drag_active,
	is_dark_mode,
	bg_drag,
	bg_card,
	bg_subtle,
	border_subtle,
	text_heading,
	text_muted,
	file_input_ref,
	folder_input_ref,
	on_drag_enter,
	on_drag_over,
	on_drag_leave,
	on_drop,
	on_file_change
}: {
	is_drag_active: boolean
	is_dark_mode: boolean
	bg_drag: string
	bg_card: string
	bg_subtle: string
	border_subtle: string
	text_heading: string
	text_muted: string
	file_input_ref: React.RefObject<HTMLInputElement | null>
	folder_input_ref: React.RefObject<HTMLInputElement | null>
	on_drag_enter: (e: React.DragEvent) => void
	on_drag_over: (e: React.DragEvent) => void
	on_drag_leave: (e: React.DragEvent) => void
	on_drop: (e: React.DragEvent) => void
	on_file_change: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
	const drag_bg = is_drag_active
		? `border-blue-500 ${bg_drag}`
		: `${is_dark_mode ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-900' : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50'}`
	const icon_container_bg = is_drag_active
		? 'bg-blue-500/20 text-blue-500'
		: is_dark_mode
			? 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700'
			: 'bg-zinc-200 text-zinc-500 group-hover:bg-zinc-300'

	return (
		<div
			onDragEnter={on_drag_enter}
			onDragOver={on_drag_over}
			onDragLeave={on_drag_leave}
			onDrop={on_drop}
			className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group ${drag_bg}`}
		>
			<input
				type="file"
				multiple
				accept="image/*,.zip"
				className="hidden"
				ref={file_input_ref}
				onChange={on_file_change}
			/>
			<input
				type="file"
				{...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
				multiple
				className="hidden"
				ref={folder_input_ref}
				onChange={on_file_change}
			/>

			<div
				className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${icon_container_bg}`}
			>
				<UploadCloud size={32} />
			</div>

			<h3 className={`text-lg font-medium mb-1 ${text_heading}`}>
				Click to browse or drag and drop
			</h3>
			<p className={`text-sm ${text_muted} max-w-[300px] mb-6`}>
				Support for JPG, PNG, WEBP, or ZIP archives containing images. Folders preserve hierarchy.
			</p>

			<div className="flex gap-3">
				<button
					onClick={() => file_input_ref.current?.click()}
					className={`px-4 py-2 text-sm font-medium rounded-lg border ${border_subtle} ${bg_card} hover:${bg_subtle} transition-colors ${text_heading}`}
				>
					Browse Files
				</button>
				<button
					onClick={() => folder_input_ref.current?.click()}
					className={`px-4 py-2 text-sm font-medium rounded-lg border ${border_subtle} ${bg_card} hover:${bg_subtle} transition-colors ${text_heading} flex items-center gap-2`}
				>
					<Folder size={16} /> Upload Folder
				</button>
			</div>
		</div>
	)
}
