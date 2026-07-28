export function render_add_cog_dialog(params: {
	is_open: boolean
	new_cog_url: string
	on_url_change: (url: string) => void
	on_add: () => void
	on_close: () => void
	is_dark_mode: boolean
	border_subtle: string
	bg_panel: string
	text_muted: string
	text_heading: string
	bg_hover: string
}) {
	if (!params.is_open) return undefined
	return (
		<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
			<div
				className={`rounded-lg shadow-xl border ${params.border_subtle} ${params.bg_panel} w-full max-w-md p-6`}
			>
				<h2 className={`text-lg font-semibold mb-4 ${params.text_heading}`}>Add COG Layer</h2>
				<p className={`text-xs ${params.text_muted} mb-3`}>
					Enter the URL of a Cloud Optimized GeoTIFF to display as a raster layer.
				</p>
				<input
					autoFocus
					type="text"
					value={params.new_cog_url}
					onChange={(e) => params.on_url_change(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && params.new_cog_url.trim()) {
							params.on_add()
						}
						if (e.key === 'Escape') {
							params.on_close()
						}
					}}
					placeholder="https://example.com/layer.tif"
					className={`w-full bg-transparent border rounded px-3 py-2 text-sm outline-none mb-4 ${
						params.is_dark_mode
							? 'border-zinc-700 text-zinc-100 placeholder-zinc-500'
							: 'border-zinc-300 text-zinc-900 placeholder-zinc-400'
					}`}
				/>
				<div className="flex justify-end gap-3">
					<button
						onClick={params.on_close}
						className={`px-4 py-2 rounded-md text-sm font-medium border ${params.border_subtle} ${params.text_muted} ${params.bg_hover} transition-colors`}
					>
						Cancel
					</button>
					<button
						onClick={params.on_add}
						disabled={!params.new_cog_url.trim()}
						className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Add Layer
					</button>
				</div>
			</div>
		</div>
	)
}
