export function buildLiveinExpiryEmail(shifts: { caregiver: string; client: string }[], dateStr: string) {
  const rows = shifts.map(s => `
    <tr>
      <td style="padding:14px 20px;border-bottom:1px solid #f0ebe3;">
        <span style="font-weight:600;color:#1C1814;font-size:15px;">${s.client}</span>
      </td>
      <td style="padding:14px 20px;border-bottom:1px solid #f0ebe3;">
        <span style="color:#6b6560;font-size:14px;">${s.caregiver}</span>
      </td>
      <td style="padding:14px 20px;border-bottom:1px solid #f0ebe3;text-align:right;">
        <span style="display:inline-block;background:#FEF0EA;color:#C4785A;font-weight:700;font-size:13px;padding:4px 12px;border-radius:20px;">${dateStr}</span>
      </td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>24h-Betreuung Erinnerung</title>
</head>
<body style="margin:0;padding:0;background:#FAF5EE;font-family:'Georgia',serif;">
  <div style="max-width:580px;margin:40px auto;padding:0 16px;">

    <!-- Logo-Bereich -->
    <div style="text-align:center;padding:32px 0 20px;">
      <div style="display:inline-block;">
        <span style="font-size:36px;font-weight:400;letter-spacing:2px;">
          <span style="color:#1C1814;">karo</span><span style="color:#C4785A;font-style:italic;">hilft</span>
        </span>
        <div style="width:40px;height:2px;background:linear-gradient(90deg,#C4785A,#a85e42);margin:8px auto 0;border-radius:2px;"></div>
      </div>
    </div>

    <!-- Hauptkarte -->
    <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(196,120,90,.12);">

      <!-- Oranger Streifen oben -->
      <div style="height:5px;background:linear-gradient(90deg,#C4785A,#e8a07a,#C4785A);"></div>

      <!-- Inhalt -->
      <div style="padding:36px 40px;">

        <!-- Icon + Titel -->
        <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:28px;">
          <div style="width:48px;height:48px;background:linear-gradient(135deg,#FEF0EA,#fad9c8);border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:22px;text-align:center;line-height:48px;">⏰</div>
          <div>
            <h1 style="margin:0 0 6px;font-size:22px;font-weight:400;color:#1C1814;line-height:1.3;">Betreuung läuft aus</h1>
            <p style="margin:0;font-size:14px;color:#a09a94;line-height:1.5;">Folgende 24h-Betreuungen enden in <strong style="color:#C4785A;">2 Wochen</strong></p>
          </div>
        </div>

        <!-- Tabelle -->
        <div style="border-radius:12px;overflow:hidden;border:1px solid #f0ebe3;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <thead>
              <tr style="background:#FAF5EE;">
                <th style="padding:10px 20px;text-align:left;font-size:11px;font-weight:600;color:#a09a94;text-transform:uppercase;letter-spacing:1.5px;">Klient</th>
                <th style="padding:10px 20px;text-align:left;font-size:11px;font-weight:600;color:#a09a94;text-transform:uppercase;letter-spacing:1.5px;">Betreuer</th>
                <th style="padding:10px 20px;text-align:right;font-size:11px;font-weight:600;color:#a09a94;text-transform:uppercase;letter-spacing:1.5px;">Bis</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <!-- Hinweis -->
        <div style="margin-top:24px;padding:16px 20px;background:#FAF5EE;border-radius:12px;border-left:3px solid #C4785A;">
          <p style="margin:0;font-size:13px;color:#6b6560;line-height:1.6;">
            Bitte organisiere rechtzeitig einen Nachfolger, damit die Betreuung lückenlos weitergeht.
          </p>
        </div>

        <!-- Button -->
        <div style="margin-top:28px;text-align:center;">
          <a href="https://app.karohilft.at/admin/livein"
             style="display:inline-block;padding:14px 36px;background:linear-gradient(145deg,#C4785A,#a85e42);color:#fff;text-decoration:none;border-radius:50px;font-size:14px;font-weight:600;letter-spacing:.5px;box-shadow:0 6px 20px rgba(196,120,90,.35);">
            Zur 24h-Betreuung →
          </a>
        </div>

      </div>

      <!-- Footer innerhalb der Karte -->
      <div style="padding:20px 40px 28px;border-top:1px solid #f0ebe3;background:#FAF5EE;text-align:center;">
        <p style="margin:0;font-size:12px;color:#c4bdb6;line-height:1.8;">
          karohilft · office@karohilft.at · +43 677 61482115<br>
          Diese Erinnerung wird automatisch täglich um 08:00 Uhr versandt.
        </p>
      </div>

    </div>

    <!-- Außen-Footer -->
    <div style="text-align:center;padding:20px 0 40px;">
      <p style="margin:0;font-size:11px;color:#c4bdb6;font-style:italic;">Verlässlich an Ihrer Seite.</p>
    </div>

  </div>
</body>
</html>`
}
