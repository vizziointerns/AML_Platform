import { ArrowLeft, Plus } from 'lucide-react'
import VirtualGallery from '../../../../components/VirtualGallery'
import type { DatasetInfo } from '../../../../hooks/use_datasets'
import type { DatasetImage } from '../../../../hooks/use_dataset_images'
import { is_drive_url } from '../../../../utils/drive_image'

export function dataset_explorer_view({
	drive_statuses = {},
	dataset,
	is_dark_mode,
	on_back,
	on_add_data,
	on_start_training,
	on_start_annotating,
	images,
	on_delete_images,
	is_deleting_images,
	on_open_annotation
}: {
	drive_statuses?: Record<string, 'uploading' | 'uploaded' | 'failed'>
	dataset: DatasetInfo
	is_dark_mode: boolean
	on_back: () => void
	on_add_data: () => void
	on_start_training: () => void
	on_start_annotating: () => void
	images: DatasetImage[]
	on_delete_images: (image_ids: string[]) => Promise<void>
	is_deleting_images: boolean
	on_open_annotation: (image_id: string) => void
}) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const hover_bg_subtle = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
	const hover_border_subtle = is_dark_mode ? 'hover:border-zinc-800' : 'hover:border-zinc-200'

	const gallery_images = images.map((img) => ({
		id: img.id,
		url: img.file_url,
		width: img.width,
		height: img.height,
		classes: img.class_labels,
		status: (img.class_labels?.length ?? 0) > 0 ? 'annotated' : 'unannotated',
		file_extension: img.file_extension,
		drive_status: is_drive_url(img.file_url)
			? ('uploaded' as const)
			: (drive_statuses[img.file_url] ?? undefined)
	}))

	const handle_open_annotation = (img: { id: string | number }) => {
		on_open_annotation(String(img.id))
	}

	const info_parts = [
		`${images.length.toLocaleString()} images`,
		dataset.class_count > 0 ? `${dataset.class_count} classes` : ''
	].filter(Boolean)

	return (
		<div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-140px)]">
			<div className="page-header shrink-0">
				<div className="flex items-center gap-4">
					<button
						onClick={on_back}
						className={`p-2 rounded-md ${hover_bg_subtle} border border-transparent ${hover_border_subtle} transition-colors text-zinc-500`}
					>
						<ArrowLeft size={20} />
					</button>
					<div>
						<h1 className={`text-2xl font-semibold tracking-tight ${text_heading}`}>
							{dataset.name}
						</h1>
						<p className={`text-sm mt-1 ${text_muted}`}>
							{info_parts.join(' — ') || 'No data yet'}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={on_add_data}
						className={`px-4 py-2 text-sm font-medium flex items-center gap-2 rounded-md border ${border_subtle} ${bg_card} ${hover_bg_subtle} transition-colors ${text_heading}`}
					>
						<Plus size={16} /> Add Data
					</button>
					<button
						onClick={on_start_annotating}
						disabled={images.length === 0}
						className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Start Annotating
					</button>
					<button
						onClick={on_start_training}
						className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm transition-colors"
					>
						Start Training
					</button>
				</div>
			</div>

			<div className="flex-1 min-h-[500px]">
				<VirtualGallery
					is_dark_mode={is_dark_mode}
					images={gallery_images}
					on_delete_selected={on_delete_images}
					is_deleting_selected={is_deleting_images}
					on_open_annotation={handle_open_annotation}
				/>
			</div>
		</div>
	)
}
