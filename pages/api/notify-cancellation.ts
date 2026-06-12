import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { caregiver_name, client_name, datum, zeit_von, zeit_bis } = req.body

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const apiKey = process.env.RESEND_API_KEY
  if (!serviceKey || !apiKey) return res.status(200).json({ skipped: true })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const { data: admins, error: dbError } = await db.from('caregivers').select('email').eq('role', 'admin')
  if (dbError) return res.status(200).json({ skipped: true, reason: 'db_error', detail: dbError.message })
  const recipients = (admins || []).map(a => a.email).filter(Boolean)
  if (recipients.length === 0) return res.status(200).json({ skipped: true, reason: 'no_recipients', admins })

  const dateLabel = new Date(datum + 'T00:00:00').toLocaleDateString('de-AT', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Karohilft <onboarding@resend.dev>',
      to: recipients,
      subject: `Storno eines Einsatzes – ${dateLabel}`,
      text: `Hallo,\n\n${caregiver_name} hat den folgenden Einsatz storniert:\n\nKlient/in: ${client_name}\nDatum: ${dateLabel}\nUhrzeit: ${zeit_von?.slice(0, 5)}–${zeit_bis?.slice(0, 5)}\n\nDer Einsatz wurde als "Noch zu vergeben" markiert und muss neu vergeben werden.\n\nViele Grüße\nKarohilft App`,
    }),
  })

  if (!resendRes.ok) {
    const detail = await resendRes.text()
    return res.status(200).json({ success: false, status: resendRes.status, detail })
  }

  return res.status(200).json({ success: true })
}
