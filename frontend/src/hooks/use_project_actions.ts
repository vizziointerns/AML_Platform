import { useState, useEffect, useRef } from 'react'
import { use_project_store, type Project } from '../store/projectStore'
import { supabase } from '../utils/supabase'
import { convert_tiff_to_png, tiff_data_url_to_file } from '../utils/tiff'

export function use_project_actions() {
	const { duplicateProject: duplicate_project, updateProject: update_project } = use_project_store()

	const [menu_open, set_menu_open] = useState<string | undefined>(undefined)
	const [delete_target, set_delete_target] = useState<Project | undefined>(undefined)
	const [rename_target, set_rename_target] = useState<Project | undefined>(undefined)
	const [rename_name, set_rename_name] = useState('')
	const [toast, set_toast] = useState<{ type: 'success' | 'error'; message: string } | undefined>(
		undefined
	)
	const [is_uploading_cover, set_is_uploading_cover] = useState(false)

	const file_input_ref = useRef<HTMLInputElement>(undefined!)
	const cover_project_id = useRef<string | undefined>(undefined)

	useEffect(() => {
		if (!toast) return
		const timer = setTimeout(() => set_toast(undefined), 4000)
		return () => clearTimeout(timer)
	}, [toast])

	useEffect(() => {
		if (!menu_open) return
		const handler = () => set_menu_open(undefined)
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [menu_open])

	const show_toast = (message: string, type: 'success' | 'error' = 'success') => {
		set_toast({ type, message })
	}

	const handle_rename_open = (project: Project) => {
		set_rename_target(project)
		set_rename_name(project.name)
		set_menu_open(undefined)
	}

	const handle_rename_save = async () => {
		if (!rename_target || !rename_name.trim()) return
		const new_name = rename_name.trim()
		const { error: rename_err } = await supabase
			.from('projects')
			.update({ name: new_name })
			.eq('id', rename_target.id)
		if (rename_err) {
			show_toast(`Failed to rename: ${rename_err.message}`, 'error')
			return
		}
		update_project(rename_target.id, { name: new_name })
		set_rename_target(undefined)
		show_toast(`Project renamed to "${new_name}"`)
	}

	const handle_add_cover = (project_id: string) => {
		if (is_uploading_cover) return
		cover_project_id.current = project_id
		file_input_ref.current?.click()
	}

	const handle_cover_upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (is_uploading_cover) return
		set_is_uploading_cover(true)
		const file = e.target.files?.[0]
		if (!file || !cover_project_id.current) {
			set_is_uploading_cover(false)
			return
		}
		const pid = cover_project_id.current
		let file_to_upload: File = file
		const is_tiff = /\.tiff?$/i.test(file.name)
		try {
			if (is_tiff) {
				const png_data_url = await convert_tiff_to_png(file)
				file_to_upload = await tiff_data_url_to_file(png_data_url, file.name)
			}

			const { data: existing } = await supabase.storage
				.from('project-covers')
				.list(pid ? pid + '/' : undefined, { limit: 1 })

			const file_path = `${pid}/${Date.now()}-${file_to_upload.name}`
			const { error: upload_err } = await supabase.storage
				.from('project-covers')
				.upload(file_path, file_to_upload)
			if (upload_err) {
				show_toast(`Failed to upload cover: ${upload_err.message}`, 'error')
				return
			}

			const {
				data: { publicUrl: public_url }
			} = supabase.storage.from('project-covers').getPublicUrl(file_path)

			const { error: db_err } = await supabase
				.from('projects')
				.update({ thumbnail: public_url })
				.eq('id', pid)
			if (db_err) {
				show_toast(`Failed to save cover: ${db_err.message}`, 'error')
				return
			}

			if (existing && existing.length > 0 && existing[0]) {
				await supabase.storage.from('project-covers').remove([`${pid}/${existing[0].name}`])
			}

			update_project(pid, { thumbnail: public_url })
			show_toast('Cover photo added')
		} catch {
			show_toast('Failed to process cover photo', 'error')
		} finally {
			e.target.value = ''
			cover_project_id.current = undefined
			set_is_uploading_cover(false)
		}
	}

	const handle_delete = (project: Project) => {
		set_delete_target(project)
		set_menu_open(undefined)
	}

	return {
		menu_open,
		set_menu_open,
		delete_target,
		set_delete_target,
		rename_target,
		set_rename_target,
		rename_name,
		set_rename_name,
		toast,
		set_toast,
		show_toast,
		file_input_ref,
		is_uploading_cover,
		handle_rename_open,
		handle_rename_save,
		handle_add_cover,
		handle_cover_upload,
		handle_delete,
		duplicate_project
	}
}
