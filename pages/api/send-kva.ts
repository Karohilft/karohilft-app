import type { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY fehlt' })

  const { to, klient, angebotsnr, anmerkungEmail, pdfBase64,
    strasse, plz, ort, datum, art, tagessatz, tage, fahrtkosten,
    stunden_woche, wochen, stundensatz, pflegestufe, anmerkung } = req.body as {
    to: string; klient: string; angebotsnr: string; anmerkungEmail: string; pdfBase64: string
    strasse?: string; plz?: string; ort?: string; datum?: string; art?: string
    tagessatz?: number; tage?: number; fahrtkosten?: number
    stunden_woche?: number; wochen?: number; stundensatz?: number
    pflegestufe?: number; anmerkung?: string
  }

  if (!to || !pdfBase64) return res.status(400).json({ error: 'Fehlende Felder' })

  const resend = new Resend(resendKey)

  const begleittext = `Sehr geehrte Damen und Herren,

vielen Dank für Ihr Interesse an unserer 24-Stunden-Betreuung.

Im Anhang finden Sie Ihren persönlichen Kostenvoranschlag${angebotsnr ? ` (${angebotsnr})` : ''}${klient ? ` für die Betreuung von ${klient}` : ''} mit allen wichtigen Informationen und Kosten übersichtlich zusammengefasst.

${anmerkungEmail ? anmerkungEmail + '\n\n' : ''}Sollten Sie Fragen haben oder unser Angebot annehmen wollen, melden Sie sich gerne jederzeit per E-Mail oder telefonisch bei uns. Wir sind gerne für Sie da.

Herzliche Grüße
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

  // In Datenbank speichern (server-side mit service role key, kein RLS-Problem)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    const { error: dbErr } = await db.from('kostenvoranschlaege').upsert({
      angebotsnr: angebotsnr || null,
      klient: klient || null,
      strasse: strasse || null,
      plz: plz || null,
      ort: ort || null,
      datum: datum || new Date().toISOString().slice(0, 10),
      art: art || '24h',
      tagessatz: tagessatz || null,
      tage: tage || null,
      fahrtkosten: fahrtkosten || null,
      stunden_woche: stunden_woche || null,
      wochen: wochen || null,
      stundensatz: stundensatz || null,
      pflegestufe: pflegestufe || 0,
      anmerkung: anmerkung || null,
      status: 'versendet',
    }, { onConflict: 'angebotsnr' })
    if (dbErr) console.error('DB save error:', JSON.stringify(dbErr))
  }

  res.status(200).json({ ok: true })
}
