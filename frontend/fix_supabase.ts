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
  console.log('Fetching projects...')
  const { data: projects, error } = await supabase.from('projects').select('id, task_type')
  if (error) {
    console.error('Error fetching projects:', error)
    return
  }

  for (const p of projects) {
    let newType = ''
    if (p.task_type === 'Object Detection (YOLO)' || p.task_type === 'yolo') {
      newType = 'detect'
    } else if (p.task_type === 'Image Segmentation (SAM)' || p.task_type === 'sam') {
      newType = 'segment'
    }

    if (newType) {
      console.log(`Updating project ${p.id}: ${p.task_type} -> ${newType}`)
      const { error: updateErr } = await supabase
        .from('projects')
        .update({ task_type: newType })
        .eq('id', p.id)
      
      if (updateErr) {
        console.error(`Failed to update project ${p.id}:`, updateErr)
      } else {
        console.log(`Successfully updated project ${p.id}`)
      }
    }
  }
  console.log('Done.')
}

run()
