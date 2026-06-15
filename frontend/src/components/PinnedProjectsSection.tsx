import { Pin } from 'lucide-react'

interface PinnedProjectsSectionProps {
	count: number
	is_dark_mode: boolean
	children: React.ReactNode
}

export function pinned_projects_section({
	count,
	is_dark_mode,
	children
}: PinnedProjectsSectionProps) {
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'

	if (count === 0) return undefined

	return (
		<div className="animate-in fade-in slide-in-from-top-2 duration-300">
			<div className="flex items-center gap-2 mb-4">
				<Pin size={16} className="text-yellow-500" fill="currentColor" />
				<h2 className={`text-lg font-semibold tracking-tight ${text_heading}`}>Pinned Projects</h2>
				<span
					className={`text-xs px-2 py-0.5 rounded-full ${is_dark_mode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}
				>
					{count}
				</span>
			</div>
			{children}
		</div>
	)
}
