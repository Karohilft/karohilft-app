import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Nicht eingeloggt' })

  const { id } = req.body
  if (!id) return res.status(400).json({ error: 'id fehlt' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Ungültiger Token' })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY nicht konfiguriert' })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { data: caller } = await db.from('caregivers').select('role').eq('email', user.email).single()
  if (caller?.role !== 'admin') return res.status(403).json({ error: 'Kein Admin-Zugriff' })

  const { data: target } = await db.from('caregivers').select('email').eq('id', id).single()

  await db.from('schedule').update({ caregiver_id: null }).eq('caregiver_id', id)

  const { error: delError } = await db.from('caregivers').delete().eq('id', id)
  if (delError) return res.status(500).json({ error: delError.message })

  if (target?.email) {
    const { data: list } = await db.auth.admin.listUsers()
    const authUser = list?.users.find(u => u.email === target.email)
    if (authUser) await db.auth.admin.deleteUser(authUser.id)
  }

  return res.status(200).json({ success: true })
}
