import type { ElementType } from 'react'

export function nav_button({
	icon: Icon,
	label,
	is_active,
	is_expanded,
	on_click
}: {
	icon: ElementType
	label: string
	is_active: boolean
	is_expanded: boolean
	on_click: () => void
}) {
	return (
		<button
			onClick={on_click}
			className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${
				is_active
					? 'bg-blue-600 text-white shadow-sm'
					: 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-700 dark:hover:text-zinc-100'
			} ${!is_expanded && 'justify-center px-0'}`}
			title={!is_expanded ? label : undefined}
		>
			<Icon size={18} className={is_active ? 'text-white' : 'text-zinc-400'} />
			{is_expanded && <span>{label}</span>}
		</button>
	)
}

export function nav_section({
	items,
	current_id,
	is_expanded,
	on_click
}: {
	items: { id: string; label: string; icon: ElementType }[]
	current_id: string | null
	is_expanded: boolean
	on_click: (id: string) => void
}) {
	return (
		<ul className="space-y-1 px-2">
			{items.map((item) => (
				<li key={item.id}>
					{nav_button({
						icon: item.icon,
						label: item.label,
						is_active: current_id === item.id,
						is_expanded,
						on_click: () => on_click(item.id)
					})}
				</li>
			))}
		</ul>
	)
}
