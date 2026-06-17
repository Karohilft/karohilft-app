import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const { data: all } = await supabase.from('schedule').select('id')
  const count = all?.length || 0

  if (count === 0) return res.json({ deleted: 0, message: 'Keine Einträge vorhanden.' })

  const batchSize = 100
  for (let i = 0; i < count; i += batchSize) {
    const ids = all!.slice(i, i + batchSize).map(r => r.id)
    const { error } = await supabase.from('schedule').delete().in('id', ids)
    if (error) return res.status(500).json({ error: error.message, deletedSoFar: i })
  }

  res.json({ deleted: count, message: `${count} Einträge gelöscht. Du kannst jetzt neu eintragen.` })
}
