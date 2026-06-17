import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const { data: all, error } = await supabase
    .from('schedule')
    .select('id,caregiver_id,client_id,datum,zeit_von,zeit_bis')
    .order('datum')
    .order('zeit_von')
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })

  const seen = new Set<string>()
  const dupeIds: string[] = []

  for (const row of all || []) {
    const key = `${row.caregiver_id}|${row.client_id}|${row.datum}|${row.zeit_von}|${row.zeit_bis}`
    if (seen.has(key)) {
      dupeIds.push(row.id)
    } else {
      seen.add(key)
    }
  }

  if (dupeIds.length === 0) return res.json({ deleted: 0, message: 'Keine Duplikate gefunden.' })

  const batchSize = 100
  for (let i = 0; i < dupeIds.length; i += batchSize) {
    const batch = dupeIds.slice(i, i + batchSize)
    const { error: delErr } = await supabase.from('schedule').delete().in('id', batch)
    if (delErr) return res.status(500).json({ error: delErr.message, deletedSoFar: i })
  }

  res.json({ deleted: dupeIds.length, message: `${dupeIds.length} Duplikat(e) gelöscht.` })
}
