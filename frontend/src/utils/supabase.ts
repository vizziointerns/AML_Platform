import { createClient } from '@supabase/supabase-js'

const supabase_url = import.meta.env.VITE_SUPABASE_URL
const supabase_key =
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabase_url || !supabase_key) {
	throw new Error(
		'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY/VITE_SUPABASE_ANON_KEY in .env(.local)'
	)
}

export const supabase = createClient(supabase_url, supabase_key)
