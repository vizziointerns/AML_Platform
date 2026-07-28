import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'

export interface DatasetInfo {
	id: string
	project_id: string
	name: string
	description: string | null
	status: string
	image_count: number
	class_count: number
	tags: string[]
	storage_bytes: number
	created_at: string
	updated_at: string
	drive_folder_id?: string
}

export interface UseDatasetsResult {
	datasets: DatasetInfo[]
	is_loading: boolean
	error: string | undefined
	refresh: () => void
}

async function fetch_image_counts(dataset_ids: string[]): Promise<Record<string, number>> {
	const count_map: Record<string, number> = {}
	if (dataset_ids.length === 0) return count_map

	const { data: counts, error: counts_err } = await supabase
		.from('dataset_images')
		.select('dataset_id')
		.in('dataset_id', dataset_ids)

	if (counts_err) return count_map

	for (const row of counts ?? []) {
		count_map[row.dataset_id] = (count_map[row.dataset_id] ?? 0) + 1
	}
	return count_map
}

export function use_datasets(project_id: string | undefined): UseDatasetsResult {
	const [datasets, set_datasets] = useState<DatasetInfo[]>([])
	const [is_loading, set_is_loading] = useState(true)
	const [error, set_error] = useState<string | undefined>()
	const [refresh_key, set_refresh_key] = useState(0)

	const do_fetch = useCallback(
		async (is_cancelled: { current: boolean }) => {
			if (!project_id) {
				set_datasets([])
				set_is_loading(false)
				set_error(undefined)
				return
			}

			set_is_loading(true)
			set_error(undefined)
			const { data, error: err } = await supabase
				.from('datasets')
				.select('*')
				.eq('project_id', project_id)
				.order('updated_at', { ascending: false })

			if (is_cancelled.current) return

			if (err) {
				if (
					!err.message?.includes('does not exist') &&
					!err.message?.includes('Could not find the table') &&
					err.code !== '406'
				) {
					set_error(err.message)
				}
				set_datasets([])
				set_is_loading(false)
				return
			}

			const normalized = (data ?? []).map((row) => ({
				...row,
				tags: Array.isArray(row.tags) ? row.tags : [],
				image_count: row.image_count ?? 0,
				class_count: row.class_count ?? 0,
				storage_bytes: row.storage_bytes ?? 0
			}))

			if (normalized.length > 0 && !is_cancelled.current) {
				const count_map = await fetch_image_counts(normalized.map((d) => d.id))
				if (is_cancelled.current) return
				for (const ds of normalized) {
					ds.image_count = count_map[ds.id] ?? 0
				}
			}

			set_datasets(normalized as DatasetInfo[])
			set_is_loading(false)
		},
		[project_id]
	)

	useEffect(() => {
		const is_cancelled = { current: false }
		do_fetch(is_cancelled)
		return () => {
			is_cancelled.current = true
		}
	}, [project_id, refresh_key, do_fetch])

	const refresh = useCallback(() => {
		set_refresh_key((k) => k + 1)
	}, [])

	return { datasets, is_loading, error, refresh }
}

/*
-- Supabase SQL to create the datasets table:

CREATE TABLE datasets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Processing',
  image_count INTEGER DEFAULT 0,
  class_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  storage_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own datasets" ON datasets
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own datasets" ON datasets
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own datasets" ON datasets
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own datasets" ON datasets
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );
*/
