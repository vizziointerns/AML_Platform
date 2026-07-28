import type React from 'react'
import { Layers, ImageIcon, Box, HardDrive } from 'lucide-react'
import type { DashboardStats } from '../../hooks/use_dashboard_stats'

function stat_card({
	title,
	value,
	icon: Icon,
	is_dark_mode,
	text_muted
}: {
	title: string
	value: string
	icon: React.ElementType
	is_dark_mode: boolean
	text_muted: string
}) {
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'

	return (
		<div className={`stat-card ${card_classes}`}>
			<div className="flex justify-between items-start mb-3">
				<div className={`text-sm font-medium ${text_muted}`}>{title}</div>
				<div className={`p-2 rounded-lg ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
					<Icon size={18} className={is_dark_mode ? 'text-zinc-300' : 'text-zinc-600'} />
				</div>
			</div>
			<div className="text-2xl font-bold tracking-tight">{value}</div>
		</div>
	)
}

function stat_skeleton({ is_dark_mode }: { is_dark_mode: boolean }) {
	const card_classes = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'

	return (
		<div className={`stat-card ${card_classes}`}>
			<div className="flex justify-between items-start mb-3">
				<div
					className={`h-4 w-24 rounded animate-pulse ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
				/>
				<div className={`p-2 rounded-lg ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
					<div className="w-[18px] h-[18px]" />
				</div>
			</div>
			<div
				className={`h-8 w-16 rounded animate-pulse ${is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'}`}
			/>
		</div>
	)
}

function format_bytes(bytes: number): string {
	const gb = bytes / 1_000_000_000
	if (gb >= 1) return `${gb.toFixed(1)} GB`
	const mb = bytes / 1_000_000
	if (mb >= 1) return `${mb.toFixed(1)} MB`
	const kb = bytes / 1_000
	if (kb >= 1) return `${kb.toFixed(1)} KB`
	return `${bytes} B`
}

function format_count(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
	return n.toString()
}

function stats_grid({
	stats,
	is_loading,
	error,
	is_refreshing,
	is_dark_mode,
	text_muted
}: {
	stats: DashboardStats | undefined
	is_loading: boolean
	error: string | undefined
	is_refreshing: boolean
	is_dark_mode: boolean
	text_muted: string
}) {
	const resolved = stats ?? {
		total_projects: 0,
		total_images: 0,
		storage_used_bytes: 0,
		total_models: 0
	}

	return (
		<div className="relative">
			{is_refreshing && (
				<div className="absolute -top-3 right-0 z-10 flex items-center gap-1.5 text-[11px] text-blue-500 font-medium">
					<div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
					Refreshing...
				</div>
			)}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{is_loading && !error ? (
					<>
						{stat_skeleton({ is_dark_mode })}
						{stat_skeleton({ is_dark_mode })}
						{stat_skeleton({ is_dark_mode })}
						{stat_skeleton({ is_dark_mode })}
					</>
				) : (
					<>
						{stat_card({
							title: 'Total Projects',
							value: format_count(resolved.total_projects),
							icon: Layers,
							is_dark_mode,
							text_muted
						})}
						{stat_card({
							title: 'Total Images',
							value: format_count(resolved.total_images),
							icon: ImageIcon,
							is_dark_mode,
							text_muted
						})}
						{stat_card({
							title: 'Models Trained',
							value: format_count(resolved.total_models),
							icon: Box,
							is_dark_mode,
							text_muted
						})}
						{stat_card({
							title: 'Storage Used',
							value: format_bytes(resolved.storage_used_bytes),
							icon: HardDrive,
							is_dark_mode,
							text_muted
						})}
					</>
				)}
				{error && <div className="col-span-full text-xs text-red-500">{error}</div>}
			</div>
		</div>
	)
}

export { stats_grid, stat_card, stat_skeleton, format_bytes, format_count }
