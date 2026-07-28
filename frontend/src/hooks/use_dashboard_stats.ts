import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { use_auth } from '../contexts/auth_context'

export interface DashboardStats {
	total_projects: number
	total_images: number
	storage_used_bytes: number
	total_models: number
}

export interface UseDashboardStatsResult {
	stats: DashboardStats | undefined
	is_loading: boolean
	is_refreshing: boolean
	error: string | undefined
}

export function use_dashboard_stats(): UseDashboardStatsResult {
	const { user } = use_auth()
	const [stats, set_stats] = useState<DashboardStats | undefined>()
	const [is_loading, set_is_loading] = useState(true)
	const [is_refreshing, set_is_refreshing] = useState(false)
	const [has_loaded_once, set_has_loaded_once] = useState(false)
	const [error, set_error] = useState<string | undefined>()
	const [refresh_key, set_refresh_key] = useState(0)

	const refresh = useCallback(() => {
		set_refresh_key((current) => current + 1)
	}, [])

	useEffect(() => {
		if (!user) {
			set_stats(undefined)
			set_error(undefined)
			set_is_loading(false)
			set_has_loaded_once(false)
			return
		}

		let is_cancelled = false
		if (has_loaded_once) {
			set_is_refreshing(true)
		} else {
			set_is_loading(true)
		}
		set_error(undefined)
		;(async () => {
			const { data, error: err } = await supabase.rpc('get_dashboard_stats')
			if (is_cancelled) return

			if (err) {
				set_error(err.message)
			} else if (data) {
				const sv = data as DashboardStats
				const model_count = await fetch_model_count(user!.id)
				if (!is_cancelled) {
					set_stats({ ...sv, total_models: model_count })
				}
			}

			set_is_loading(false)
			set_is_refreshing(false)
			set_has_loaded_once(true)
		})()

		return () => {
			is_cancelled = true
		}
	}, [user, refresh_key])

	useEffect(() => {
		if (!user) return

		const channel = supabase
			.channel(`dashboard-stats-${user.id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'projects',
					filter: `user_id=eq.${user.id}`
				},
				refresh
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'datasets'
				},
				refresh
			)
			.subscribe()

		const on_focus = () => refresh()
		window.addEventListener('focus', on_focus)
		window.addEventListener('datasets-changed', refresh)
		window.addEventListener('upload-complete', refresh)

		return () => {
			window.removeEventListener('focus', on_focus)
			window.removeEventListener('datasets-changed', refresh)
			window.removeEventListener('upload-complete', refresh)
			void supabase.removeChannel(channel)
		}
	}, [user, refresh])

	return { stats, is_loading, is_refreshing, error }
}

async function fetch_model_count(user_id: string): Promise<number> {
	const { data: projects } = await supabase.from('projects').select('id').eq('user_id', user_id)

	if (!projects || projects.length === 0) return 0

	const api_base = import.meta.env.VITE_API_BASE_URL ?? '/api'
	const ids = projects.map((p: { id: string }) => p.id).join(',')
	try {
		const resp = await fetch(`${api_base}/training/count?project_ids=${ids}`)
		if (resp.ok) {
			const result = await resp.json()
			return result.total ?? 0
		}
	} catch {
		// non-critical
	}
	return 0
}

/*
-- Supabase SQL to create the get_dashboard_stats RPC function.
-- Run this in the Supabase SQL Editor:

CREATE OR REPLACE FUNCTION get_dashboard_stats()
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
    SELECT d.id FROM datasets d
    WHERE d.project_id IN (SELECT id FROM user_projects)
  ),
  image_stats AS (
    SELECT
      COUNT(*)::INT AS total_images,
      COALESCE(SUM(file_size_bytes), 0)::BIGINT AS storage_used_bytes
    FROM dataset_images
    WHERE dataset_id IN (SELECT id FROM project_datasets)
  ),
  SELECT json_build_object(
    'total_projects', (SELECT COUNT(*)::INT FROM user_projects),
    'total_images', COALESCE((SELECT total_images FROM image_stats), 0),
    'storage_used_bytes', COALESCE((SELECT storage_used_bytes FROM image_stats), 0),
  ) INTO result;
  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO authenticated;
*/
