import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env', 'utf-8')
const env: Record<string, string> = {}
for (const line of envFile.split('\n')) {
  if (line && line.includes('=')) {
    const [key, ...vals] = line.split('=')
    env[key.trim()] = vals.join('=').trim()
  }
}

const supabaseUrl = env['VITE_SUPABASE_URL']
const supabaseKey = env['VITE_SUPABASE_ANON_KEY']

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: projects, error } = await supabase.from('projects').select('id, task_type')
  console.log(projects)
}
run()
