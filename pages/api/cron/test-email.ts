import type { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY fehlt' })

  const resend = new Resend(resendKey)
  const targetStr = '2026-08-25'

  const testShifts = [
    { caregiver: { name: 'Maria Huber' }, client: { name: 'Franz Müller' } },
    { caregiver: { name: 'Anna Schmidt' }, client: { name: 'Gerda Wagner' } },
  ]

  function buildEmail(shifts: any[], date: string) {
    const rows = shifts.map(s => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f0ebe3;font-weight:600;color:#1C1814;">${s.client.name}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0ebe3;color:#6b6560;">${s.caregiver.name}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f0ebe3;color:#C4785A;font-weight:600;">${date}</td>
      </tr>`).join('')

    return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF5EE;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(28,24,20,.08);">
    <div style="background:linear-gradient(135deg,#C4785A,#a85e42);padding:32px 36px;">
      <div style="font-size:28px;font-weight:400;color:#fff;letter-spacing:1px;">karohilft</div>
      <div style="font-size:13px;color:rgba(255,255,255,.75);margin-top:4px;letter-spacing:2px;text-transform:uppercase;">24h-Betreuung · Erinnerung</div>
    </div>
    <div style="padding:32px 36px;">
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:400;color:#1C1814;">Ablauf in 2 Wochen</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#6b6560;line-height:1.6;">
        Die folgenden 24h-Betreuungen laufen am <strong style="color:#C4785A;">${date}</strong> aus.<br>
        Bitte rechtzeitig einen Nachfolger organisieren.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #f0ebe3;">
        <thead>
          <tr style="background:#FAF5EE;">
            <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b6560;text-transform:uppercase;letter-spacing:1px;">Klient</th>
            <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b6560;text-transform:uppercase;letter-spacing:1px;">Betreuer</th>
            <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#6b6560;text-transform:uppercase;letter-spacing:1px;">Bis</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:28px;">
        <a href="https://app.karohilft.at/admin/livein" style="display:inline-block;padding:13px 28px;background:linear-gradient(145deg,#C4785A,#a85e42);color:#fff;text-decoration:none;border-radius:50px;font-size:14px;font-weight:500;letter-spacing:.5px;">
          Zur 24h-Betreuung →
        </a>
      </div>
    </div>
    <div style="padding:20px 36px;border-top:1px solid #f0ebe3;background:#FAF5EE;">
      <p style="margin:0;font-size:12px;color:#a09a94;line-height:1.6;">
        Karohilft · office@karohilft.at · +43 677 61482115<br>
        Diese E-Mail wird automatisch täglich um 08:00 Uhr gesendet.
      </p>
    </div>
  </div>
</body>
</html>`
  }

  await resend.emails.send({
    from: 'Karohilft <noreply@karohilft.at>',
    to: 'office@karohilft.at',
    subject: `🧪 Test: 24h-Betreuung läuft in 2 Wochen aus (${targetStr})`,
    html: buildEmail(testShifts, targetStr),
  })

  return res.status(200).json({ sent: true })
}
