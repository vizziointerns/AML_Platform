import { AlertCircle } from 'lucide-react'
import type { Alert } from '../../hooks/use_alerts'

function alert_skeleton(is_dark_mode: boolean) {
	const skeleton_bg = is_dark_mode ? 'bg-zinc-800' : 'bg-zinc-200'
	return (
		<div
			className={`flex gap-3 animate-pulse p-3 rounded-lg border ${is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'}`}
		>
			<div className={`w-4 h-4 rounded mt-0.5 shrink-0 ${skeleton_bg}`} />
			<div className="flex-1 space-y-2">
				<div className={`h-3 w-40 rounded ${skeleton_bg}`} />
				<div className={`h-2.5 w-56 rounded ${skeleton_bg}`} />
			</div>
		</div>
	)
}

function alert_colors(severity: Alert['severity'], is_dark_mode: boolean) {
	if (severity === 'danger') {
		return is_dark_mode
			? 'bg-red-500/5 border-red-500/20 text-red-400'
			: 'bg-red-50 border-red-200 text-red-800'
	}
	if (severity === 'warning') {
		return is_dark_mode
			? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
			: 'bg-amber-50 border-amber-200 text-amber-800'
	}
	return is_dark_mode
		? 'bg-blue-500/5 border-blue-500/20 text-blue-400'
		: 'bg-blue-50 border-blue-200 text-blue-800'
}

function alert_icon_color(severity: Alert['severity']) {
	if (severity === 'danger') return 'text-red-500'
	if (severity === 'warning') return 'text-amber-500'
	return 'text-blue-500'
}

function alerts_widget({
	alerts,
	is_loading,
	is_dark_mode,
	card_classes
}: {
	alerts: Alert[]
	is_loading: boolean
	is_dark_mode: boolean
	card_classes: string
}) {
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'

	return (
		<div className={`rounded-xl border ${card_classes} p-5`}>
			<h3 className="font-semibold text-base tracking-tight mb-4 flex items-center gap-2">
				<AlertCircle size={16} className="text-amber-500" /> Alerts
			</h3>
			<div className="space-y-3">
				{is_loading ? (
					<>
						{alert_skeleton(is_dark_mode)}
						{alert_skeleton(is_dark_mode)}
					</>
				) : alerts.length === 0 ? (
					<p className={`text-sm ${text_muted} text-center py-4`}>
						No alerts — everything looks good
					</p>
				) : (
					alerts.map((alert) => (
						<div
							key={alert.id}
							className={`p-3 rounded-lg border flex gap-3 text-sm ${alert_colors(alert.severity, is_dark_mode)}`}
						>
							<div className="mt-0.5">
								<AlertCircle size={16} className={alert_icon_color(alert.severity)} />
							</div>
							<div>
								<div className="font-medium">{alert.title}</div>
								<div className={`text-xs mt-1 opacity-70`}>{alert.description}</div>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	)
}

export { alerts_widget, alert_skeleton, alert_colors, alert_icon_color }
