import { Eye, EyeOff, Trash2, Plus, Layers, ChevronRight, ChevronDown } from 'lucide-react'
import type { CogLayerInfo } from '../../../../components/AnnotationCanvas/types'
import { PALETTE_NAMES } from '../../../../utils/colormaps'
import type { PaletteName } from '../../../../utils/colormaps'

const PALETTE_LABELS: Record<PaletteName, string> = {
	grayscale: 'Grayscale',
	jet: 'Jet',
	hot: 'Hot',
	coolwarm: 'Coolwarm',
	viridis: 'Viridis',
	plasma: 'Plasma',
	inferno: 'Inferno',
	turbo: 'Turbo'
}

function render_palette_select(value: string, on_change: (v: string) => void, select_cls: string) {
	return (
		<select value={value} onChange={(e) => on_change(e.target.value)} className={select_cls}>
			{PALETTE_NAMES.map((name) => (
				<option key={name} value={name}>
					{PALETTE_LABELS[name]}
				</option>
			))}
		</select>
	)
}

export function render_satellite_layer_item(
	layer: CogLayerInfo,
	on_update: (id: string, patch: Partial<CogLayerInfo>) => void,
	on_remove: (id: string) => void,
	isDarkMode: boolean,
	text_heading: string,
	text_muted: string,
	border_subtle: string
) {
	const select_cls = `bg-transparent border rounded px-1 py-0.5 text-[10px] ${isDarkMode ? 'border-zinc-700 text-zinc-100' : 'border-zinc-300 text-zinc-900'}`
	const input_cls = `bg-transparent border rounded px-1 py-0.5 text-[10px] w-14 ${isDarkMode ? 'border-zinc-700 text-zinc-100' : 'border-zinc-300 text-zinc-900'}`

	return (
		<div
			key={layer.id}
			className={`p-2 rounded-md border ${border_subtle} ${isDarkMode ? 'bg-zinc-900/50' : 'bg-white'} space-y-2`}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 min-w-0">
					<button
						onClick={() => on_update(layer.id, { visible: !layer.visible })}
						className={`p-0.5 rounded ${layer.visible ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : text_muted}`}
					>
						{layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
					</button>
					<span className={`text-xs font-medium ${text_heading} truncate max-w-24`}>
						{layer.name}
					</span>
				</div>
				<button
					onClick={() => on_remove(layer.id)}
					className="p-0.5 text-red-500 hover:text-red-400 transition-colors"
				>
					<Trash2 size={12} />
				</button>
			</div>

			<div className="flex items-center gap-2">
				<span className={`text-[10px] ${text_muted} w-8`}>Opacity</span>
				<input
					type="range"
					min="0"
					max="100"
					value={layer.opacity}
					onChange={(e) => on_update(layer.id, { opacity: parseInt(e.target.value) })}
					className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
				/>
				<span className={`text-[10px] ${text_muted} w-6 text-right`}>{layer.opacity}%</span>
			</div>

			<div className="flex items-center gap-2">
				<span className={`text-[10px] ${text_muted} w-8`}>Band</span>
				<input
					type="number"
					min="0"
					value={layer.band}
					onChange={(e) =>
						on_update(layer.id, { band: Math.max(0, parseInt(e.target.value) || 0) })
					}
					className={input_cls}
				/>
				<span className={`text-[10px] ${text_muted} ml-1`}>Palette</span>
				{render_palette_select(
					layer.palette,
					(v) => on_update(layer.id, { palette: v as CogLayerInfo['palette'] }),
					`${select_cls} flex-1`
				)}
			</div>
		</div>
	)
}

export function render_satellite_layers_panel(
	cog_layers: CogLayerInfo[],
	on_update_layer: (id: string, patch: Partial<CogLayerInfo>) => void,
	on_remove_layer: (id: string) => void,
	on_add_layer: () => void,
	is_open: boolean,
	set_is_open: (v: boolean) => void,
	is_cog_project: boolean,
	isDarkMode: boolean,
	text_heading: string,
	text_muted: string,
	border_subtle: string,
	bg_hover: string
) {
	if (!is_cog_project) return undefined

	return (
		<div className="flex-1 flex flex-col min-h-0">
			<button
				onClick={() => set_is_open(!is_open)}
				className={`flex items-center justify-between p-3 border-b ${border_subtle} ${bg_hover} transition-colors w-full text-left`}
			>
				<div
					className={`flex items-center gap-2 text-sm font-semibold tracking-tight ${text_heading}`}
				>
					<Layers size={16} className={text_muted} /> Raster Layers
				</div>
				{is_open ? (
					<ChevronDown size={14} className={text_muted} />
				) : (
					<ChevronRight size={14} className={text_muted} />
				)}
			</button>

			{is_open && (
				<div className="flex-1 overflow-y-auto p-2 space-y-2">
					{cog_layers.map((layer) =>
						render_satellite_layer_item(
							layer,
							on_update_layer,
							on_remove_layer,
							isDarkMode,
							text_heading,
							text_muted,
							border_subtle
						)
					)}

					<button
						onClick={on_add_layer}
						className="w-full flex items-center justify-center gap-1 p-2 rounded-md border border-dashed border-zinc-600 hover:border-blue-500 text-xs text-zinc-400 hover:text-blue-400 transition-colors"
					>
						<Plus size={14} /> Add COG Layer
					</button>
				</div>
			)}
		</div>
	)
}
