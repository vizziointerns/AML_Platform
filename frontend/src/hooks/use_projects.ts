import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { use_auth } from '../contexts/auth_context'
import { use_project_store, type Project } from '../store/projectStore'
import { map_project } from '../utils/project_mapping'

function enrich_projects(
	projects: Project[],
	bulk_stats: Array<{ project_id: string; total_images: number; annotation_progress: number }>
): void {
	const stats_map = new Map(bulk_stats.map((s) => [s.project_id, s]))
	for (const proj of projects) {
		const stat = stats_map.get(proj.id)
		if (stat) {
			proj.datasetCount = stat.total_images ?? 0
			proj.annotationProgress = stat.annotation_progress ?? 0
		}
	}
}

export function use_projects() {
	const { user } = use_auth()
	const set_projects = use_project_store((s) => s.setProjects)
	const [is_loading, set_is_loading] = useState(true)
	const [error, set_error] = useState<string | undefined>()

	const fetch_projects = useCallback(async () => {
		if (!user) {
			set_projects([])
			set_is_loading(false)
			return
		}

		set_is_loading(true)
		set_error(undefined)

		const { data, error: err } = await supabase
			.from('projects')
			.select('*')
			.eq('user_id', user.id)
			.order('last_updated', { ascending: false })

		if (err) {
			if (
				err.message?.includes('does not exist') ||
				err.message?.includes('Could not find the table')
			) {
				set_projects([])
			} else {
				set_error(err.message)
			}
			set_is_loading(false)
			return
		}

		const mapped = (data ?? []).map(map_project)

		const { data: bulk_stats } = await supabase.rpc('get_bulk_project_stats')
		if (Array.isArray(bulk_stats)) {
			enrich_projects(mapped, bulk_stats)
		}

		set_projects(mapped)
		set_is_loading(false)
	}, [user, set_projects])

	useEffect(() => {
		fetch_projects()
	}, [fetch_projects])

	return { is_loading, error, refetch: fetch_projects }
}

/*
-- Supabase SQL to create the get_bulk_project_stats RPC function.
-- Run this in the Supabase SQL Editor:

CREATE OR REPLACE FUNCTION get_bulk_project_stats()
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

  WITH user_projects AS (
    SELECT id FROM projects WHERE user_id = v_user_id
  ),
  project_datasets AS (
    SELECT d.id AS dataset_id, d.project_id
    FROM datasets d
    WHERE d.project_id::TEXT IN (SELECT id::TEXT FROM user_projects)
  ),
  image_counts AS (
    SELECT
      di.dataset_id,
      COUNT(*)::INT AS total_images,
      COUNT(*) FILTER (WHERE array_length(di.class_labels, 1) > 0)::INT AS annotated_images
    FROM dataset_images di
    WHERE di.dataset_id IN (SELECT dataset_id FROM project_datasets)
    GROUP BY di.dataset_id
  ),
  project_totals AS (
    SELECT
      pd.project_id,
      COALESCE(SUM(ic.total_images), 0)::INT AS total_images,
      COALESCE(SUM(ic.annotated_images), 0)::INT AS annotated_images
    FROM project_datasets pd
    LEFT JOIN image_counts ic ON ic.dataset_id = pd.dataset_id
    GROUP BY pd.project_id
  )
  SELECT json_agg(json_build_object(
    'project_id', up.id,
    'total_images', COALESCE(pt.total_images, 0),
    'annotation_progress', CASE
      WHEN COALESCE(pt.total_images, 0) > 0
      THEN ROUND((COALESCE(pt.annotated_images, 0)::NUMERIC / pt.total_images::NUMERIC) * 100)::INT
      ELSE 0
    END
  ))
  FROM user_projects up
  LEFT JOIN project_totals pt ON pt.project_id::TEXT = up.id::TEXT
  INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_bulk_project_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_bulk_project_stats() TO authenticated;
*/
