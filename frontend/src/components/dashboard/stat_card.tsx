import type { ElementType } from 'react'

export function stat_card({
	label,
	value,
	icon: Icon,
	is_dark_mode
}: {
	label: string
	value: string | number
	icon?: ElementType
	is_dark_mode: boolean
}) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const card_cls = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'

	return (
		<div className={`stat-card ${card_cls}`}>
			<div className="flex items-center justify-between mb-3">
				<div className={`text-sm font-medium ${text_muted}`}>{label}</div>
				{Icon && (
					<div className={`p-1.5 rounded-md ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
						<Icon size={16} className={is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'} />
					</div>
				)}
			</div>
			<div className="text-2xl font-bold tracking-tight">{value}</div>
		</div>
	)
}
