import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Nicht eingeloggt' })

  // Anon-Key reicht für auth.getUser + caregivers-Abfrage mit dem User-Token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Ungültiger Token' })

  // Abfrage mit Service Role Key falls vorhanden, sonst Anon Key
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const db = serviceKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    : supabase

  const { data: caregiver } = await db
    .from('caregivers')
    .select('role')
    .eq('email', user.email)
    .single()

  if (caregiver?.role !== 'admin') {
    return res.status(403).json({ error: 'Kein Admin-Zugriff' })
  }

  return res.status(200).json({ email: user.email, role: 'admin' })
}
