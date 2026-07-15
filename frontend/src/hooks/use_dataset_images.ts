import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { resolve_image_urls } from '../utils/drive_image'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

export interface DatasetImage {
	id: string
	dataset_id: string
	file_name: string
	file_url: string
	width: number
	height: number
	file_size_bytes: number
	class_labels: string[]
	file_extension: string
	uploaded_at: string
}

export interface UseDatasetImagesResult {
	images: DatasetImage[]
	is_loading: boolean
	error: string | undefined
	delete_images: (image_ids: string[]) => Promise<{ deleted_count: number } | undefined>
}

export function use_dataset_images(dataset_id: string | undefined): UseDatasetImagesResult {
	const [images, set_images] = useState<DatasetImage[]>([])
	const [is_loading, set_is_loading] = useState(true)
	const [error, set_error] = useState<string | undefined>()
	const [refresh_counter, set_refresh_counter] = useState(0)

	/* re-fetch when datasets change (e.g. after upload) */
	useEffect(() => {
		const handler = () => set_refresh_counter((c) => c + 1)
		window.addEventListener('datasets-changed', handler)
		window.addEventListener('upload-complete', handler)
		return () => {
			window.removeEventListener('datasets-changed', handler)
			window.removeEventListener('upload-complete', handler)
		}
	}, [])

	const delete_images = useCallback(
		async (image_ids: string[]) => {
			if (!dataset_id || image_ids.length === 0) return undefined

			const ids_to_delete = new Set(image_ids)
			const previous_images = images
			const removed_images = previous_images.filter((image) => ids_to_delete.has(image.id))
			const deleted_count = removed_images.length
			const deleted_bytes = removed_images.reduce(
				(total, image) => total + (image.file_size_bytes ?? 0),
				0
			)

			if (deleted_count === 0) {
				return { deleted_count: 0 }
			}

			const drive_file_urls = removed_images
				.map((image) => image.file_url)
				.filter((url) => url && !url.startsWith('cache://'))

			set_error(undefined)
			set_images(previous_images.filter((image) => !ids_to_delete.has(image.id)))

			const { error: delete_error } = await supabase
				.from('dataset_images')
				.delete()
				.in('id', image_ids)

			if (delete_error) {
				set_images(previous_images)
				set_error(delete_error.message)
				return undefined
			}

			if (drive_file_urls.length > 0) {
				const controller = new AbortController()
				const timeout_id = setTimeout(() => controller.abort(), 10000)
				try {
					await fetch(`${API_BASE}/images/drive/delete`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ file_urls: drive_file_urls }),
						signal: controller.signal
					})
				} catch {
					// Non-critical — file stays in Drive but DB is clean
				} finally {
					clearTimeout(timeout_id)
				}
			}

			const { data: dataset_row, error: dataset_error } = await supabase
				.from('datasets')
				.select('image_count, storage_bytes')
				.eq('id', dataset_id)
				.single()

			if (!dataset_error && dataset_row) {
				await supabase
					.from('datasets')
					.update({
						image_count: Math.max((dataset_row.image_count ?? 0) - deleted_count, 0),
						storage_bytes: Math.max((dataset_row.storage_bytes ?? 0) - deleted_bytes, 0)
					})
					.eq('id', dataset_id)
			}

			window.dispatchEvent(new CustomEvent('datasets-changed'))
			return { deleted_count }
		},
		[dataset_id, images]
	)

	useEffect(() => {
		if (!dataset_id) {
			set_images([])
			set_is_loading(false)
			return
		}

		let is_cancelled = false
		set_is_loading(true)
		set_error(undefined)
		;(async () => {
			const { data, error: err } = await supabase
				.from('dataset_images')
				.select('*')
				.eq('dataset_id', dataset_id)
				.order('uploaded_at', { ascending: false })

			if (is_cancelled) return

			if (err) {
				if (
					err.message?.includes('does not exist') ||
					err.message?.includes('Could not find the table') ||
					err.code === '406'
				) {
					set_images([])
				} else {
					set_error(err.message)
				}
				set_is_loading(false)
				return
			}

			const validated = (data ?? [])
				.filter(
					(r): r is Record<string, unknown> & { id: string; file_url: string } =>
						!!r && typeof r.id === 'string' && typeof r.file_url === 'string'
				)
				.map((r) => ({
					id: r.id,
					dataset_id: r.dataset_id ?? '',
					file_name: r.file_name ?? '',
					file_url: r.file_url,
					width: r.width ?? 0,
					height: r.height ?? 0,
					file_size_bytes: r.file_size_bytes ?? 0,
					class_labels: Array.isArray(r.class_labels) ? r.class_labels : [],
					file_extension: r.file_extension ?? '',
					uploaded_at: r.uploaded_at ?? ''
				})) as DatasetImage[]

			if (is_cancelled) return

			await resolve_image_urls(validated)

			if (is_cancelled) return

			set_images(validated)
			set_is_loading(false)
		})()

		return () => {
			is_cancelled = true
		}
	}, [dataset_id, refresh_counter])

	return { images, is_loading, error, delete_images }
}

/*
-- Supabase SQL to create the dataset_images table:

CREATE TABLE dataset_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  file_size_bytes BIGINT DEFAULT 0,
  class_labels TEXT[] DEFAULT '{}',
  file_extension TEXT DEFAULT '',
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dataset_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dataset images" ON dataset_images
  FOR SELECT USING (
    dataset_id IN (
      SELECT id FROM datasets WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert their own dataset images" ON dataset_images
  FOR INSERT WITH CHECK (
    dataset_id IN (
      SELECT id FROM datasets WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their own dataset images" ON dataset_images
  FOR DELETE USING (
    dataset_id IN (
      SELECT id FROM datasets WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      )
    )
  );
*/
