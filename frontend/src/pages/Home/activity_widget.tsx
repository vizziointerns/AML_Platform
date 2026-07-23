import type { ActivityItem } from '../../hooks/use_activity_feed'

function activity_skeleton(is_dark_mode: boolean) {
	const skeleton_bg = is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'
	return (
		<div className="flex gap-3 animate-pulse">
			<div className={`w-8 h-8 rounded-full shrink-0 ${skeleton_bg}`} />
			<div className="flex-1 space-y-2 py-1">
				<div className={`h-3 w-48 rounded ${skeleton_bg}`} />
				<div className={`h-2.5 w-16 rounded ${skeleton_bg}`} />
			</div>
		</div>
	)
}

function team_activity_widget({
	items,
	is_loading,
	avatar_text,
	is_dark_mode,
	text_muted,
	card_classes
}: {
	items: ActivityItem[]
	is_loading: boolean
	avatar_text: string
	is_dark_mode: boolean
	text_muted: string
	card_classes: string
}) {
	return (
		<div className={`rounded-xl border ${card_classes} p-5`}>
			<h3 className="font-semibold text-base tracking-tight mb-4">Activity</h3>
			<div className="space-y-4">
				{is_loading ? (
					<>
						{activity_skeleton(is_dark_mode)}
						{activity_skeleton(is_dark_mode)}
						{activity_skeleton(is_dark_mode)}
						{activity_skeleton(is_dark_mode)}
						{activity_skeleton(is_dark_mode)}
					</>
				) : items.length === 0 ? (
					<p className={`text-sm ${text_muted} text-center py-4`}>No recent activity</p>
				) : (
					items.map((item) => (
						<div key={item.id} className="flex gap-3">
							<div
								className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center text-xs font-medium ${is_dark_mode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'}`}
							>
								{avatar_text}
							</div>
							<div className="flex-1 min-w-0">
								<div className="text-sm">{item.description}</div>
								<div className={`text-xs ${text_muted} mt-0.5`}>{item.relative_time}</div>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	)
}

export { team_activity_widget, activity_skeleton }
