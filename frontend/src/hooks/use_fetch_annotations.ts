import { useEffect } from 'react'
import { fetch_annotations } from '../api/annotations'
import type { Annotation } from '../pages/projects/pages/annotation/types'

export function use_fetch_annotations(
	imageId: string | undefined,
	image_url: string | undefined,
	set_history: React.Dispatch<React.SetStateAction<Annotation[][]>>,
	set_history_step: React.Dispatch<React.SetStateAction<number>>,
	set_selected_ann_id: (id: string | undefined) => void
) {
	useEffect(() => {
		if (!imageId || !image_url) return

		let is_cancelled = false

		fetch_annotations(imageId)
			.then((loaded) => {
				if (is_cancelled) return
				if (loaded.length > 0) {
					set_history([loaded])
					set_history_step(0)
					set_selected_ann_id(undefined)
				} else {
					set_history([[]])
					set_history_step(0)
					set_selected_ann_id(undefined)
				}
			})
			.catch((err) => {
				if (!is_cancelled) console.error('Failed to load annotations:', err)
			})

		return () => {
			is_cancelled = true
		}
	}, [imageId, image_url])
}
