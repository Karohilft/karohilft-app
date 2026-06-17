import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Nicht eingeloggt' })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert' })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Ungültiger Token' })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { data: caller } = await db.from('caregivers').select('role').eq('email', user.email).single()
  if (caller?.role !== 'admin') return res.status(403).json({ error: 'Kein Admin-Zugriff' })

  const { id, ...payload } = req.body
  if (!id) return res.status(400).json({ error: 'ID fehlt' })

  if (typeof payload.languages === 'string') {
    payload.languages = payload.languages.split(',').map((s: string) => s.trim()).filter(Boolean)
  }

  const { error: updateError } = await db.from('caregivers').update(payload).eq('id', id)
  if (updateError) return res.status(400).json({ error: updateError.message })

  return res.status(200).json({ success: true })
}
