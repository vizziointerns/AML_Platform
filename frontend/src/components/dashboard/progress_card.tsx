export function progress_card({
	label,
	value,
	is_dark_mode
}: {
	label: string
	value: number
	is_dark_mode: boolean
}) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const card_cls = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'
	const clamped_value = Math.min(100, Math.max(0, value))

	return (
		<div className={`p-5 rounded-xl border flex flex-col ${card_cls}`}>
			<div className={`text-sm font-medium ${text_muted} mb-3`}>{label}</div>
			<div className="text-2xl font-bold tracking-tight">{clamped_value}%</div>
			<div
				className={`mt-2 h-1.5 rounded-full overflow-hidden ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
			>
				<div
					className="h-full bg-blue-500 rounded-full transition-all duration-500"
					style={{ width: `${clamped_value}%` }}
				/>
			</div>
		</div>
	)
}
