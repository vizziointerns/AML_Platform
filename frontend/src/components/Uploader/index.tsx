import { use_upload } from '../../hooks/use_upload'
import UploadDialog from './upload_dialog'
import UploadQueue from './upload_queue'

export default function uploader({
	isOpen,
	on_close,
	is_dark_mode
}: {
	isOpen: boolean
	on_close: () => void
	is_dark_mode: boolean
}) {
	const upload = use_upload(on_close)

	if (!isOpen) return undefined

	const text_heading = is_dark_mode ? 'text-zinc-100' : 'text-zinc-900'
	const text_muted = is_dark_mode ? 'text-zinc-400' : 'text-zinc-500'
	const border_subtle = is_dark_mode ? 'border-zinc-800' : 'border-zinc-200'
	const bg_card = is_dark_mode ? 'bg-zinc-900' : 'bg-white'
	const bg_subtle = is_dark_mode ? 'bg-zinc-800/50' : 'bg-zinc-50'
	const bg_drag = is_dark_mode ? 'bg-blue-500/5' : 'bg-blue-50'

	if (upload.is_minimized) {
		return (
			<UploadQueue
				on_close={upload.close_and_clear}
				on_maximize={() => upload.set_is_minimized(false)}
				is_dark_mode={is_dark_mode}
				text_heading={text_heading}
				text_muted={text_muted}
				border_subtle={border_subtle}
				bg_card={bg_card}
				is_uploading={upload.is_uploading}
				completed_files={upload.completed_files}
				total_files={upload.total_files}
				error_files={upload.error_files}
				files={upload.files}
			/>
		)
	}

	return (
		<UploadDialog
			on_close={upload.close_and_clear}
			on_minimize={() => upload.set_is_minimized(true)}
			is_dark_mode={is_dark_mode}
			text_heading={text_heading}
			text_muted={text_muted}
			border_subtle={border_subtle}
			bg_card={bg_card}
			bg_subtle={bg_subtle}
			bg_drag={bg_drag}
			files={upload.files}
			is_drag_active={upload.is_drag_active}
			target_dataset={upload.target_dataset}
			on_target_dataset_change={upload.set_target_dataset}
			file_input_ref={upload.file_input_ref}
			folder_input_ref={upload.folder_input_ref}
			on_drag_enter={upload.handle_drag_enter}
			on_drag_over={upload.handle_drag_over}
			on_drag_leave={upload.handle_drag_leave}
			on_drop={upload.handle_drop}
			on_file_change={upload.handle_file_change}
			on_start_upload={upload.start_upload}
			on_retry_upload={upload.retry_upload}
			on_remove_file={upload.remove_file}
			on_clear_all={upload.clear_all}
			format_size={upload.format_size}
			total_files={upload.total_files}
			completed_files={upload.completed_files}
			error_files={upload.error_files}
			is_uploading={upload.is_uploading}
			pending_count={upload.pending_count}
			google_auth={upload.google_auth}
			datasets={upload.datasets}
			new_dataset_name={upload.new_dataset_name}
			on_new_dataset_name_change={upload.set_new_dataset_name}
			new_dataset_description={upload.new_dataset_description}
			on_new_dataset_description_change={upload.set_new_dataset_description}
			is_all_complete={upload.is_all_complete}
		/>
	)
}
