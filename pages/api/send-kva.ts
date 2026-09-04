import type { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY fehlt' })

  const { to, klient, angebotsnr, anmerkungEmail, pdfBase64 } = req.body as {
    to: string
    klient: string
    angebotsnr: string
    anmerkungEmail: string
    pdfBase64: string
  }

  if (!to || !pdfBase64) return res.status(400).json({ error: 'Fehlende Felder' })

  const resend = new Resend(resendKey)

  const begleittext = `Sehr geehrte Damen und Herren,

anbei erhalten Sie Ihren persönlichen Kostenvoranschlag${angebotsnr ? ` (${angebotsnr})` : ''}${klient ? ` für die Betreuung von ${klient}` : ''}.

${anmerkungEmail ? anmerkungEmail + '\n\n' : ''}Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr Karohilft-Team

–
Karohilft
+43 677 61482115
office@karohilft.at
www.karohilft.at`

  const htmlText = begleittext.replace(/\n/g, '<br>')

  const pdfBuffer = Buffer.from(pdfBase64, 'base64')
  const filename = `Kostenvoranschlag${angebotsnr ? '-' + angebotsnr : ''}${klient ? '-' + klient.replace(/\s+/g, '-') : ''}.pdf`

  const { error } = await resend.emails.send({
    from: 'Karohilft <office@karohilft.at>',
    to,
    subject: `Kostenvoranschlag${klient ? ' für ' + klient : ''}${angebotsnr ? ' · ' + angebotsnr : ''}`,
    html: `<div style="font-family:Georgia,serif;color:#1C1814;font-size:15px;line-height:1.8;max-width:560px">${htmlText}</div>`,
    attachments: [{ filename, content: pdfBuffer }],
  })

  if (error) {
    console.error('Resend error:', JSON.stringify(error))
    return res.status(500).json({ error })
  }
  res.status(200).json({ ok: true })
}
