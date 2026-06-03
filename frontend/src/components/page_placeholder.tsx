import { useLocation } from 'react-router-dom'
import { use_app_context } from '../contexts/app_context'

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function page_placeholder() {
	const { is_dark_mode } = use_app_context()
	const location = useLocation()
	const label = capitalize(location.pathname.split('/').filter(Boolean).pop() ?? 'Page')
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'

	return (
		<div className="flex-1 overflow-y-auto p-4 lg:p-8">
			<div className="max-w-7xl mx-auto space-y-6">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
					<p className={`text-sm mt-1 ${text_muted}`}>{label} overview and management.</p>
				</div>
				<div
					className={`rounded-xl border p-12 flex items-center justify-center ${is_dark_mode ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}`}
				>
					<p className={text_muted}>{label} page — coming soon.</p>
				</div>
			</div>
		</div>
	)
}
