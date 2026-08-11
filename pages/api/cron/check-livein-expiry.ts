import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { buildLiveinExpiryEmail } from '../../../lib/emailTemplate'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()

  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY fehlt' })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY fehlt' })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const resend = new Resend(resendKey)

  const target = new Date()
  target.setDate(target.getDate() + 14)
  const targetStr = target.toISOString().slice(0, 10)

  const { data: shifts } = await db
    .from('live_in_shifts')
    .select('id,caregiver:caregivers(name),client:clients(name)')
    .eq('end_date', targetStr)

  if (!shifts || shifts.length === 0) {
    return res.status(200).json({ checked: true, found: 0 })
  }

  const mapped = shifts.map((s: any) => ({
    caregiver: s.caregiver?.name || 'Kein Betreuer',
    client: s.client?.name || 'Unbekannt',
  }))

  await resend.emails.send({
    from: 'Karohilft <noreply@karohilft.at>',
    to: 'office@karohilft.at',
    subject: `⚠️ 24h-Betreuung läuft in 2 Wochen aus (${targetStr})`,
    html: buildLiveinExpiryEmail(mapped, targetStr),
  })

  return res.status(200).json({ sent: shifts.length })
}
