import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

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
}

export function use_dataset_images(dataset_id: string | undefined): UseDatasetImagesResult {
	const [images, set_images] = useState<DatasetImage[]>([])
	const [is_loading, set_is_loading] = useState(true)
	const [error, set_error] = useState<string | undefined>()

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

			set_images((data ?? []) as DatasetImage[])
			set_is_loading(false)
		})()

		return () => {
			is_cancelled = true
		}
	}, [dataset_id])

	return { images, is_loading, error }
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
