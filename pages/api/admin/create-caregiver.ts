import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Nicht eingeloggt' })

  const { name, email, phone, role, birthdate, languages, notes, password } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, E-Mail und Passwort sind erforderlich' })

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

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, must_change_password: true },
  })
  if (createError) return res.status(400).json({ error: createError.message })

  const { error: insertError } = await db.from('caregivers').insert({
    name, email, phone: phone || null, role: role || 'user',
    birthdate: birthdate || null, languages: languages || null, notes: notes || null,
  })
  if (insertError) {
    if (created.user) await db.auth.admin.deleteUser(created.user.id)
    return res.status(400).json({ error: insertError.message })
  }

  return res.status(200).json({ success: true })
}
