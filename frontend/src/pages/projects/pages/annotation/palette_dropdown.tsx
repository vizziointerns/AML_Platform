import { Layers } from 'lucide-react'
import { PALETTE_NAMES } from '../../../../utils/colormaps'

export function render_palette_dropdown(
	is_cog_project: boolean,
	is_open: boolean,
	set_is_open: (v: boolean) => void,
	bg_palette: string,
	set_bg_palette: (v: string) => void,
	bg_band: number,
	set_bg_band: (v: number) => void,
	band_count: number | undefined,
	bg_panel: string,
	border_subtle: string,
	text_muted: string,
	bg_hover: string,
	ref_obj: React.RefObject<HTMLDivElement | null>
) {
	if (!is_cog_project) return undefined
	const band_options = band_count ? Array.from({ length: band_count }, (_, i) => i) : []

	return (
		<div ref={ref_obj} className="absolute top-2 right-2 z-50">
			<button
				onClick={() => set_is_open(!is_open)}
				className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${
					is_open
						? 'bg-blue-500/20 border-blue-500 text-blue-400'
						: `${bg_panel} ${border_subtle} ${text_muted} hover:border-zinc-500`
				}`}
				title="Band & Palette"
			>
				<Layers size={16} />
			</button>
			{is_open && (
				<div
					className={`absolute right-0 top-10 mt-1 py-2 rounded-lg border shadow-lg ${bg_panel} ${border_subtle} min-w-36 max-h-80 overflow-y-auto`}
				>
					<div
						className={`px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider ${text_muted}`}
					>
						Band
					</div>
					{band_options.map((b) => (
						<button
							key={b}
							onClick={() => {
								set_bg_band(b)
								set_is_open(false)
							}}
							className={`w-full text-left px-3 py-1 text-[11px] transition-colors ${
								b === bg_band ? 'bg-blue-500/20 text-blue-400' : `${text_muted} ${bg_hover}`
							}`}
						>
							Band {b}
						</button>
					))}
					<div className={`mx-3 my-1.5 border-t ${border_subtle}`} />
					<div
						className={`px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider ${text_muted}`}
					>
						Palette
					</div>
					{PALETTE_NAMES.map((name) => (
						<button
							key={name}
							onClick={() => {
								set_bg_palette(name)
								set_is_open(false)
							}}
							className={`w-full text-left px-3 py-1 text-[11px] transition-colors ${
								name === bg_palette ? 'bg-blue-500/20 text-blue-400' : `${text_muted} ${bg_hover}`
							}`}
						>
							{name.charAt(0).toUpperCase() + name.slice(1)}
						</button>
					))}
				</div>
			)}
		</div>
	)
}
