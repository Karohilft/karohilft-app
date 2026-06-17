import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Nicht eingeloggt' })

  const { name, email, phone, role, card_type, birthdate, languages, notes } = req.body
  if (!name || !email) return res.status(400).json({ error: 'Name und E-Mail sind erforderlich' })

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

  const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://app.karohilft.at'}/login`,
  })
  if (inviteError) return res.status(400).json({ error: inviteError.message })

  const { error: insertError } = await db.from('caregivers').insert({
    name, email, phone: phone || null, role: role || 'user',
    card_type: card_type || 'team',
    birthdate: birthdate || null,
    languages: languages ? (typeof languages === 'string' ? languages.split(',').map((s: string) => s.trim()).filter(Boolean) : languages) : null,
    notes: notes || null,
  })
  if (insertError) {
    if (invited.user) await db.auth.admin.deleteUser(invited.user.id)
    return res.status(400).json({ error: insertError.message })
  }

  return res.status(200).json({ success: true })
}
