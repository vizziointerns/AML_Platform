import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

export interface ProjectStats {
	total_images: number
	total_annotations: number
	total_classes: number
	total_datasets: number
	storage_bytes: number
}

export interface UseProjectStatsResult {
	stats: ProjectStats | undefined
	is_loading: boolean
	error: string | undefined
}

export function use_project_stats(project_id: string | undefined): UseProjectStatsResult {
	const [stats, set_stats] = useState<ProjectStats | undefined>()
	const [is_loading, set_is_loading] = useState(true)
	const [error, set_error] = useState<string | undefined>()

	useEffect(() => {
		if (!project_id) {
			set_stats(undefined)
			set_is_loading(false)
			return
		}

		let is_cancelled = false
		set_is_loading(true)
		set_error(undefined)
		;(async () => {
			const { data, error: err } = await supabase
				.from('project_stats')
				.select('*')
				.eq('project_id', project_id)
				.single()

			if (is_cancelled) return

			if (err) {
				if (
					err.message?.includes('does not exist') ||
					err.message?.includes('Could not find the table')
				) {
					set_stats({
						total_images: 0,
						total_annotations: 0,
						total_classes: 0,
						total_datasets: 0,
						storage_bytes: 0
					})
				} else if (err.message?.includes('row')) {
					set_stats({
						total_images: 0,
						total_annotations: 0,
						total_classes: 0,
						total_datasets: 0,
						storage_bytes: 0
					})
				} else {
					set_stats(undefined)
					set_error(err.message)
				}
				set_is_loading(false)
				return
			}

			if (data) {
				set_stats({
					total_images: data.total_images ?? 0,
					total_annotations: data.total_annotations ?? 0,
					total_classes: data.total_classes ?? 0,
					total_datasets: data.total_datasets ?? 0,
					storage_bytes: data.storage_bytes ?? 0
				})
			}
			set_is_loading(false)
		})()

		return () => {
			is_cancelled = true
		}
	}, [project_id])

	return { stats, is_loading, error }
}

/*
-- Supabase SQL to create the project_stats table:
CREATE TABLE project_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  total_images INTEGER DEFAULT 0,
  total_annotations INTEGER DEFAULT 0,
  total_classes INTEGER DEFAULT 0,
  total_datasets INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Enable Row Level Security
ALTER TABLE project_stats ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only see their own project stats
CREATE POLICY "Users can view their own project stats" ON project_stats
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Trigger to auto-create a stats row when a project is created
CREATE OR REPLACE FUNCTION handle_new_project_stats()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.project_stats (project_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created_create_stats
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_project_stats();
*/
