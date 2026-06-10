import type { ElementType } from 'react'

export interface ActionItem {
	label: string
	icon: ElementType
	on_click?: () => void
	variant?: 'primary' | 'secondary'
}

export function quick_actions_card({
	actions,
	is_dark_mode
}: {
	actions: ActionItem[]
	is_dark_mode: boolean
}) {
	const card_cls = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'

	return (
		<div className={`rounded-xl border ${card_cls} p-5`}>
			<h3 className="font-semibold text-base tracking-tight mb-4">Quick Actions</h3>
			<div className="flex flex-wrap gap-3">
				{actions.map((action) => {
					if (action.variant === 'primary') {
						return (
							<button
								key={action.label}
								type="button"
								onClick={action.on_click}
								className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
							>
								<action.icon size={16} /> {action.label}
							</button>
						)
					}
					return (
						<button
							key={action.label}
							type="button"
							onClick={action.on_click}
							className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${is_dark_mode ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
						>
							<action.icon size={16} /> {action.label}
						</button>
					)
				})}
			</div>
		</div>
	)
}
