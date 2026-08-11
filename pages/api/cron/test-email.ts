import type { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'
import { buildLiveinExpiryEmail } from '../../../lib/emailTemplate'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY fehlt' })

  const resend = new Resend(resendKey)
  const targetStr = '2026-08-25'

  const testShifts = [
    { caregiver: 'Maria Huber', client: 'Franz Müller' },
    { caregiver: 'Anna Schmidt', client: 'Gerda Wagner' },
  ]

  await resend.emails.send({
    from: 'Karohilft <noreply@karohilft.at>',
    to: 'office@karohilft.at',
    subject: `🧪 Test: 24h-Betreuung läuft in 2 Wochen aus (${targetStr})`,
    html: buildLiveinExpiryEmail(testShifts, targetStr),
  })

  return res.status(200).json({ sent: true })
}
