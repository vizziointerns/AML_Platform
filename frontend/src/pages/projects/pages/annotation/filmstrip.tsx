import { get_cog_thumbnail_url } from '../../../../utils/cog'

interface ImageInfo {
	id: string
	file_url: string
	file_name: string
	file_extension?: string
}

export function render_filmstrip(params: {
	images: ImageInfo[]
	current_index: number
	project_id: string | undefined
	is_dark_mode: boolean
	border_subtle: string
	bg_panel: string
	on_navigate: (id: string) => void
}) {
	const { images, current_index, border_subtle } = params
	return (
		<div
			className={`h-16 border-t ${border_subtle} ${params.bg_panel} flex items-center gap-2 px-4 overflow-x-auto shrink-0 w-full`}
		>
			{images.map((img, idx) => (
				<button
					key={img.id}
					onClick={() => params.on_navigate(img.id)}
					className={`shrink-0 w-14 h-12 rounded-md border-2 overflow-hidden transition-all ${
						idx === current_index
							? 'border-blue-500 ring-1 ring-blue-500/30'
							: `${border_subtle} hover:border-blue-400/50`
					}`}
				>
					<img
						src={get_cog_thumbnail_url(img.file_url, img.file_extension)}
						alt={img.file_name}
						loading="lazy"
						className="w-full h-full object-cover"
					/>
				</button>
			))}
		</div>
	)
}
