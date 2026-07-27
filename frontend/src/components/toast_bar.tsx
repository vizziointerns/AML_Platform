import { AlertTriangle } from 'lucide-react'

export function toast_bar({
	toast,
	on_dismiss
}: {
	toast: { type: 'success' | 'error'; message: string }
	on_dismiss: () => void
}) {
	return (
		<div
			className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-in slide-in-from-bottom-4 duration-300 flex items-center gap-3 ${
				toast.type === 'success'
					? 'bg-emerald-900/90 border-emerald-700/50 text-emerald-200 backdrop-blur-sm'
					: 'bg-red-900/90 border-red-700/50 text-red-200 backdrop-blur-sm'
			}`}
			onClick={on_dismiss}
		>
			{toast.type === 'success' ? (
				<svg
					className="w-5 h-5 text-emerald-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
				</svg>
			) : (
				<AlertTriangle size={18} className="text-red-400 shrink-0" />
			)}
			{toast.message}
		</div>
	)
}
