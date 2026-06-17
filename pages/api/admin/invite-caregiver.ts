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

  const { email, name } = req.body
  if (!email) return res.status(400).json({ error: 'E-Mail fehlt' })

  const { data: existing } = await db.auth.admin.listUsers()
  const existingUser = existing?.users?.find(u => u.email === email)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.karohilft.at'

  if (existingUser) {
    const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${siteUrl}/login` },
    })
    if (linkError) return res.status(400).json({ error: linkError.message })

    const actionLink = linkData?.properties?.action_link
    return res.status(200).json({ success: true, link: actionLink })
  } else {
    const { data: inviteData, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name || '' },
      redirectTo: `${siteUrl}/login`,
    })
    if (inviteError) return res.status(400).json({ error: inviteError.message })

    const { data: linkData } = await db.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo: `${siteUrl}/login` },
    })

    const actionLink = linkData?.properties?.action_link
    return res.status(200).json({ success: true, link: actionLink })
  }
}
