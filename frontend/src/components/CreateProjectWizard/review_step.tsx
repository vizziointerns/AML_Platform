import { Check } from 'lucide-react'
import type { ProjectType } from '../../store/projectStore'

interface ReviewStepProps {
	name: string
	description: string
	type: ProjectType
	dataset_option: 'skip' | 'new' | 'existing'
	new_ds_name: string
	upload_items_count: number
	selected_ds_name: string | undefined
	is_dark_mode: boolean
}

export default function review_step({
	name,
	description,
	type,
	dataset_option,
	new_ds_name,
	upload_items_count,
	selected_ds_name,
	is_dark_mode
}: ReviewStepProps) {
	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'

	return (
		<div className="space-y-5">
			<div>
				<h3 className={`text-sm font-medium ${text_heading} mb-1`}>Review your project</h3>
				<p className={`text-xs ${text_muted}`}>
					Please confirm the details before creating your project.
				</p>
			</div>

			<div className={`space-y-3 rounded-xl border ${border_subtle} ${bg_subtle} p-4`}>
				<div className="flex items-center justify-between">
					<span className={`text-xs ${text_muted}`}>Project Name</span>
					<span className={`text-sm font-medium ${text_heading}`}>{name}</span>
				</div>
				{description && (
					<div className="flex items-center justify-between">
						<span className={`text-xs ${text_muted}`}>Description</span>
						<span className={`text-sm ${text_heading}`}>{description}</span>
					</div>
				)}
				<div className="flex items-center justify-between">
					<span className={`text-xs ${text_muted}`}>Project Type</span>
					<span className={`text-sm font-medium ${text_heading}`}>{type}</span>
				</div>
				<div className="border-t ${border_subtle}" />
				<div className="flex items-center justify-between">
					<span className={`text-xs ${text_muted}`}>Dataset</span>
					<span className={`text-sm ${text_heading}`}>
						{dataset_option === 'skip'
							? 'None (skip)'
							: dataset_option === 'new'
								? new_ds_name || 'New dataset'
								: selected_ds_name || 'Existing dataset'}
					</span>
				</div>
				{dataset_option === 'new' && upload_items_count > 0 && (
					<div className="flex items-center justify-between">
						<span className={`text-xs ${text_muted}`}>Files to upload</span>
						<span className={`text-sm ${text_heading}`}>{upload_items_count} file(s)</span>
					</div>
				)}
			</div>

			<div
				className={`flex items-center gap-2 rounded-lg border ${border_subtle} ${bg_subtle} px-4 py-3`}
			>
				<Check size={16} className="text-emerald-500 shrink-0" />
				<p className={`text-xs ${text_muted}`}>
					Your project will be created and you will be redirected to the dashboard.
				</p>
			</div>
		</div>
	)
}
