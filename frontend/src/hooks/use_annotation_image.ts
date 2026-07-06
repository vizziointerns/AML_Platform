import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { resolve_image_urls } from '../utils/drive_image'
import { use_datasets } from './use_datasets'

export interface AnnotationImageInfo {
	id: string
	file_url: string
	file_name: string
}

export interface UseAnnotationImageResult {
	images: AnnotationImageInfo[]
	stable_images: AnnotationImageInfo[]
	current_index: number
	current_image: AnnotationImageInfo | undefined
	is_loading: boolean
	is_empty: boolean
	error: string | undefined
	dataset_id: string | undefined
	go_next: () => void
	go_prev: () => void
	has_next: boolean
	has_prev: boolean
}

export function use_annotation_image(
	project_id: string | undefined,
	image_id: string | undefined
): UseAnnotationImageResult {
	const navigate = useNavigate()
	const { datasets, is_loading: is_loading_datasets } = use_datasets(project_id)
	const [images, set_images] = useState<AnnotationImageInfo[]>([])
	const [is_loading_images, set_is_loading_images] = useState(true)
	const [error, set_error] = useState<string | undefined>(undefined)

	const dataset_id = datasets[0]?.id

	useEffect(() => {
		if (!dataset_id) {
			set_images([])
			set_error(undefined)
			set_is_loading_images(false)
			return
		}

		let is_cancelled = false
		set_is_loading_images(true)
		set_error(undefined)
		;(async () => {
			const { data, error: err } = await supabase
				.from('dataset_images')
				.select('id, file_url, file_name')
				.eq('dataset_id', dataset_id)
				.order('uploaded_at', { ascending: true })

			if (is_cancelled) return
			if (err) {
				set_error(err.message)
				set_images([])
				set_is_loading_images(false)
				return
			}

			const parsed = (data ?? []).map((row) => ({
				id: row.id,
				file_url: row.file_url,
				file_name: row.file_name ?? 'Unknown'
			}))

			if (is_cancelled) return

			await resolve_image_urls(parsed)

			if (is_cancelled) return

			set_images(parsed)
			set_is_loading_images(false)
		})()

		return () => {
			is_cancelled = true
		}
	}, [dataset_id])

	const current_index = useMemo(() => {
		if (images.length === 0) return -1
		if (!image_id) return 0
		return images.findIndex((img) => img.id === image_id)
	}, [image_id, images])

	const current_image = useMemo(() => {
		if (current_index < 0) return undefined
		return images[current_index]
	}, [current_index, images])

	const has_prev = current_index > 0
	const has_next = current_index >= 0 && current_index < images.length - 1

	const go_next = useCallback(() => {
		if (!has_next) return
		const next = images[current_index + 1]
		if (next) {
			navigate(`/projects/${project_id}/annotation/${next.id}`, { replace: true })
		}
	}, [has_next, images, current_index, project_id, navigate])

	const go_prev = useCallback(() => {
		if (!has_prev) return
		const prev = images[current_index - 1]
		if (prev) {
			navigate(`/projects/${project_id}/annotation/${prev.id}`, { replace: true })
		}
	}, [has_prev, images, current_index, project_id, navigate])

	return {
		images,
		stable_images: images,
		current_index,
		current_image,
		is_loading: is_loading_datasets || is_loading_images,
		is_empty: !is_loading_datasets && !is_loading_images && images.length === 0,
		error,
		dataset_id,
		go_next,
		go_prev,
		has_next,
		has_prev
	}
}
