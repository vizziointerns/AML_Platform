import type { ComponentType } from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

export function stat_card(
	{
		title,
		value,
		icon: Icon,
		trend,
		trendUp
	}: {
		title: string
		value: string
		icon: ComponentType<{ size?: number; className?: string }>
		trend: string
		trendUp: boolean
	},
	isDarkMode: boolean,
	card_classes: string,
	text_muted: string
) {
	return (
		<div className={`p-6 rounded-xl border flex flex-col ${card_classes}`}>
			<div className="flex justify-between items-start mb-4">
				<div className={`text-sm font-medium ${text_muted}`}>{title}</div>
				<div className={`p-2 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
					<Icon size={18} className={isDarkMode ? 'text-zinc-300' : 'text-zinc-600'} />
				</div>
			</div>
			<div className="text-3xl font-bold tracking-tight mb-2">{value}</div>
			<div className={`flex items-center text-sm ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
				{trendUp ? (
					<ArrowUpRight size={16} className="mr-1" />
				) : (
					<ArrowDownRight size={16} className="mr-1" />
				)}
				<span>{trend}</span>
				<span className={`ml-2 ${text_muted}`}>vs last period</span>
			</div>
		</div>
	)
}

export function render_skeleton_cards(card_classes: string, bg_subtle: string) {
	return Array(4)
		.fill(0)
		.map((_, i) => (
			<div
				key={i}
				className={`p-6 rounded-xl border ${card_classes} min-h-[140px] flex flex-col justify-between`}
			>
				<div className="flex justify-between">
					<div className={`h-4 w-24 rounded animate-pulse ${bg_subtle}`}></div>
					<div className={`h-8 w-8 rounded-lg animate-pulse ${bg_subtle}`}></div>
				</div>
				<div className={`h-8 w-16 rounded animate-pulse ${bg_subtle} mt-4`}></div>
				<div className={`h-4 w-32 rounded animate-pulse ${bg_subtle} mt-2`}></div>
			</div>
		))
}
