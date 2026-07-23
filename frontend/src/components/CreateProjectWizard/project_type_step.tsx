import { useRef } from 'react'
import { Check, ImagePlus, Trash2, ScanLine, Shapes, SquareStack } from 'lucide-react'
import type { ProjectType } from '../../store/projectStore'

const PROJECT_TYPES: ProjectType[] = [
	'Object Detection',
	'Semantic Segmentation',
	'Instance Segmentation'
]

interface TypeMeta {
	icon: typeof ScanLine
	desc: string
}

const TYPE_META: Record<string, TypeMeta> = {
	'Object Detection': {
		icon: ScanLine,
		desc: 'Detect and locate objects in images with bounding boxes'
	},
	'Semantic Segmentation': {
		icon: Shapes,
		desc: 'Classify every pixel in an image into semantic categories'
	},
	'Instance Segmentation': {
		icon: SquareStack,
		desc: 'Detect and segment each object instance at the pixel level'
	}
}

interface ProjectTypeStepProps {
	name: string
	description: string
	type: ProjectType
	cover_preview: string
	name_error: string
	is_dark_mode: boolean
	on_name_change: (value: string) => void
	on_description_change: (value: string) => void
	on_type_change: (value: ProjectType) => void
	on_cover_select: (e: React.ChangeEvent<HTMLInputElement>) => void
	on_cover_remove: () => void
	on_name_error_clear: () => void
}

export default function project_type_step({
	name,
	description,
	type,
	cover_preview,
	name_error,
	is_dark_mode,
	on_name_change,
	on_description_change,
	on_type_change,
	on_cover_select,
	on_cover_remove,
	on_name_error_clear
}: ProjectTypeStepProps) {
	const cover_input_ref = useRef<HTMLInputElement>(undefined!)

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const hover_bg = is_dark_mode ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
	const input_bg = is_dark_mode ? 'bg-zinc-950' : 'bg-white'

	function render_type_cards() {
		return (
			<div className="grid grid-cols-3 gap-3">
				{PROJECT_TYPES.map((pt) => {
					const { icon: ICON, desc } = TYPE_META[pt]!
					const is_selected = type === pt
					return (
						<button
							key={pt}
							type="button"
							onClick={() => on_type_change(pt)}
							className={`relative p-4 rounded-xl border text-left transition-all duration-200 ${
								is_selected
									? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30'
									: `${border_subtle} ${hover_bg}`
							}`}
						>
							{is_selected && (
								<div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
									<Check size={12} className="text-white" />
								</div>
							)}
							<div
								className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
									is_selected
										? 'bg-blue-600/20 text-blue-500'
										: `${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'} ${text_muted}`
								}`}
							>
								<ICON size={20} />
							</div>
							<h4
								className={`text-sm font-semibold mb-1 ${
									is_selected ? 'text-blue-500' : text_heading
								}`}
							>
								{pt}
							</h4>
							<p className={`text-[11px] leading-relaxed ${text_muted}`}>{desc}</p>
						</button>
					)
				})}
			</div>
		)
	}

	return (
		<div className="space-y-5">
			<div className="space-y-1.5">
				<label className={`text-sm font-medium ${text_heading}`}>
					Project Name <span className="text-red-500">*</span>
				</label>
				<input
					type="text"
					value={name}
					onChange={(e) => {
						on_name_change(e.target.value)
						if (name_error) on_name_error_clear()
					}}
					placeholder="e.g. Autonomous Driving Pedestrians"
					className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors
						${border_subtle}
						${input_bg}
						${is_dark_mode ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}
						focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50
						${name_error ? 'border-red-500' : ''}`}
				/>
				{name_error && <p className="text-xs text-red-500">{name_error}</p>}
			</div>

			<div className="space-y-1.5">
				<label className={`text-sm font-medium ${text_heading}`}>Description</label>
				<textarea
					value={description}
					onChange={(e) => on_description_change(e.target.value)}
					placeholder="Brief description of your project..."
					rows={3}
					className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors resize-none
						${border_subtle}
						${input_bg}
						${is_dark_mode ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}
						focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50`}
				/>
			</div>

			<div className="space-y-2">
				<label className={`text-sm font-medium ${text_heading}`}>
					Project Type <span className="text-red-500">*</span>
				</label>
				{render_type_cards()}
			</div>

			<div className="space-y-1.5">
				<label className={`text-sm font-medium ${text_heading}`}>Cover Photo (optional)</label>
				{cover_preview ? (
					<div className="relative w-full h-32 rounded-lg overflow-hidden border ${border_subtle}">
						<img src={cover_preview} alt="Cover preview" className="w-full h-full object-cover" />
						<button
							onClick={on_cover_remove}
							className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
						>
							<Trash2 size={14} />
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => cover_input_ref.current?.click()}
						className={`w-full py-8 rounded-lg border-2 border-dashed ${border_subtle} ${hover_bg} transition-colors flex flex-col items-center justify-center gap-2`}
					>
						<ImagePlus size={24} className={text_muted} />
						<span className={`text-sm ${text_muted}`}>Click to upload a cover image</span>
					</button>
				)}
				<input
					ref={cover_input_ref}
					type="file"
					accept="image/*,.tif,.tiff"
					onChange={on_cover_select}
					hidden
				/>
			</div>
		</div>
	)
}
