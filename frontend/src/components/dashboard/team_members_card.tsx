export function team_members_card({
	members,
	is_dark_mode
}: {
	members: string[]
	is_dark_mode: boolean
}) {
	const card_cls = is_dark_mode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200 shadow-sm'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'

	if (members.length === 0) {
		return undefined
	}

	return (
		<div className={`rounded-xl border ${card_cls} p-5`}>
			<h3 className="font-semibold text-base tracking-tight mb-4">Team Members</h3>
			<div className="flex flex-wrap gap-2">
				{members.map((member, i) => (
					<div
						key={`${member}-${i}`}
						className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${bg_subtle} ${is_dark_mode ? 'text-zinc-300' : 'text-zinc-700'}`}
					>
						<div
							className={`w-6 h-6 rounded-full text-[10px] font-medium flex items-center justify-center ${is_dark_mode ? 'bg-zinc-700' : 'bg-zinc-300'}`}
						>
							{member[0]?.toUpperCase() ?? '?'}
						</div>
						{member}
					</div>
				))}
			</div>
		</div>
	)
}
