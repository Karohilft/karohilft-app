export function buildLiveinExpiryEmail(shifts: { caregiver: string; client: string }[], dateStr: string) {
  const rows = shifts.map(s => `
    <tr>
      <td style="padding:6px 0;border-bottom:1px solid #f0ebe3;">
        <div style="font-size:11px;color:#a09a94;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Klient</div>
        <div style="font-size:15px;color:#C4785A;font-weight:600;">${s.client}</div>
      </td>
      <td style="padding:6px 0 6px 16px;border-bottom:1px solid #f0ebe3;">
        <div style="font-size:11px;color:#a09a94;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Betreuer</div>
        <div style="font-size:15px;color:#1C1814;font-weight:600;">${s.caregiver}</div>
      </td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#FAF5EE;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF5EE;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(28,24,20,.08);">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:36px 40px 28px;">
              <img src="https://app.karohilft.at/karohilft-logo.svg" alt="Karohilft" height="48" style="display:block;" />
            </td>
          </tr>

          <!-- Titel -->
          <tr>
            <td align="center" style="padding:0 40px 10px;">
              <h1 style="margin:0;font-size:26px;font-weight:400;font-style:italic;color:#1C1814;line-height:1.3;">Betreuung läuft aus</h1>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td align="center" style="padding:0 40px 28px;">
              <p style="margin:0;font-size:15px;color:#6b6560;line-height:1.6;text-align:center;">
                Folgende 24h-Betreuungen enden am<br><strong style="color:#1C1814;">${dateStr}</strong> – also in 2 Wochen.
              </p>
            </td>
          </tr>

          <!-- Info-Box -->
          <tr>
            <td style="padding:0 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF5EE;border-radius:14px;padding:20px 24px;">
                <tr><td>
                  ${rows}
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- Body Text -->
          <tr>
            <td align="center" style="padding:0 40px 28px;">
              <p style="margin:0;font-size:14px;color:#6b6560;line-height:1.7;text-align:center;">
                Bitte rechtzeitig einen Nachfolger organisieren,<br>damit die Betreuung lückenlos weitergeht.
              </p>
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td align="center" style="padding:0 40px 36px;">
              <a href="https://app.karohilft.at/admin/livein"
                 style="display:inline-block;padding:14px 36px;background:#C4785A;color:#ffffff;text-decoration:none;border-radius:50px;font-size:14px;font-family:Georgia,serif;font-weight:600;letter-spacing:.3px;">
                Zur 24h-Betreuung
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:18px 40px;background:#a8c4b0;border-radius:0 0 20px 20px;">
              <p style="margin:0;font-size:13px;color:#ffffff;line-height:1.6;">
                Karohilft · <a href="https://app.karohilft.at" style="color:#ffffff;text-decoration:underline;">app.karohilft.at</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
