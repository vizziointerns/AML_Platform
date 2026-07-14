import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

export interface ProjectStats {
	total_images: number
	total_annotations: number
	total_classes: number
	total_datasets: number
	storage_bytes: number
	annotation_progress: number
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
			const { data, error: err } = await supabase.rpc('get_project_stats', {
				p_project_id: project_id
			})

			if (is_cancelled) return

			if (err) {
				set_stats(undefined)
				set_error(err.message)
				set_is_loading(false)
				return
			}

			if (data) {
				set_stats({
					total_images: data.total_images ?? 0,
					total_annotations: data.total_annotations ?? 0,
					total_classes: data.total_classes ?? 0,
					total_datasets: data.total_datasets ?? 0,
					storage_bytes: data.storage_bytes ?? 0,
					annotation_progress: data.annotation_progress ?? 0
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
-- Supabase SQL to create the get_project_stats RPC function.
-- Run this in the Supabase SQL Editor:

DROP FUNCTION IF EXISTS get_project_stats(TEXT);

CREATE OR REPLACE FUNCTION get_project_stats(p_project_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  result JSON;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;

  WITH project_datasets AS (
    SELECT id FROM datasets WHERE project_id = p_project_id
  ),
  image_stats AS (
    SELECT
      COUNT(*)::INT AS total_images,
      COALESCE(SUM(file_size_bytes), 0)::BIGINT AS storage_bytes,
      COUNT(*) FILTER (WHERE array_length(class_labels, 1) > 0)::INT AS annotated_images
    FROM dataset_images
    WHERE dataset_id IN (SELECT id FROM project_datasets)
  ),
  annotation_stats AS (
    SELECT COUNT(*)::INT AS total_annotations
    FROM dataset_images
    WHERE dataset_id IN (SELECT id FROM project_datasets)
      AND array_length(class_labels, 1) > 0
  ),
  class_stats AS (
    SELECT COUNT(DISTINCT elem)::INT AS total_classes
    FROM dataset_images,
      LATERAL unnest(class_labels) AS elem
    WHERE dataset_id IN (SELECT id FROM project_datasets)
      AND array_length(class_labels, 1) > 0
  )
  SELECT json_build_object(
    'total_datasets', (SELECT COUNT(*)::INT FROM project_datasets),
    'total_images', COALESCE((SELECT total_images FROM image_stats), 0),
    'total_annotations', COALESCE((SELECT total_annotations FROM annotation_stats), 0),
    'total_classes', COALESCE((SELECT total_classes FROM class_stats), 0),
    'storage_bytes', COALESCE((SELECT storage_bytes FROM image_stats), 0),
    'annotation_progress', CASE
      WHEN COALESCE((SELECT total_images FROM image_stats), 0) > 0
      THEN ROUND(
        (COALESCE((SELECT annotated_images FROM image_stats), 0)::NUMERIC /
         (SELECT total_images FROM image_stats)::NUMERIC) * 100
      )::INT
      ELSE 0
    END
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_project_stats(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_project_stats(TEXT) TO authenticated;
*/
