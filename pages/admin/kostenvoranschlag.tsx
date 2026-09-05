import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

const LOGO_PNG = 'data:image/png;base64,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'


const PAUSCHALE = 280

const PFLEGEGELD: Record<number, number> = {
  1: 192.97, 2: 354.03, 3: 551.10, 4: 826.84, 5: 1124.46, 6: 1568.67, 7: 2061.81
}
const BUNDESFOERDERUNG = 800

function fmt(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €'
}

export default function Kostenvoranschlag() {
  const router = useRouter()
  const [auth, setAuth] = useState(false)
  const [emailModal, setEmailModal] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailAnmerkung, setEmailAnmerkung] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<'ok' | 'err' | null>(null)
  const docRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({
    klient: '',
    strasse: '',
    plz: '',
    ort: '',
    datum: new Date().toISOString().slice(0, 10),
    art: '24h' as '24h' | 'stunden',
    tagessatz: '',
    tage: '28',
    fahrtkosten: '',
    stunden_woche: '',
    wochen: '4',
    stundensatz: '',
    pflegestufe: '0',
    anmerkung: '',
    angebotsnr: `KVA-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
  })

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setAuth(true)
      const id = new URLSearchParams(window.location.search).get('id')
      if (id) {
        // Vorhandenes Angebot laden
        const { data: kva } = await getSupabase()
          .from('kostenvoranschlaege')
          .select('*')
          .eq('id', id)
          .single()
        if (kva) {
          setForm({
            klient: kva.klient ?? '',
            strasse: kva.strasse ?? '',
            plz: kva.plz ?? '',
            ort: kva.ort ?? '',
            datum: kva.datum ?? new Date().toISOString().slice(0, 10),
            art: (kva.art === 'stunden' ? 'stunden' : '24h') as '24h' | 'stunden',
            tagessatz: kva.tagessatz != null ? String(kva.tagessatz) : '',
            tage: kva.tage != null ? String(kva.tage) : '28',
            fahrtkosten: kva.fahrtkosten != null ? String(kva.fahrtkosten) : '',
            stunden_woche: kva.stunden_woche != null ? String(kva.stunden_woche) : '',
            wochen: kva.wochen != null ? String(kva.wochen) : '4',
            stundensatz: kva.stundensatz != null ? String(kva.stundensatz) : '',
            pflegestufe: kva.pflegestufe != null ? String(kva.pflegestufe) : '0',
            anmerkung: kva.anmerkung ?? '',
            angebotsnr: kva.angebotsnr ?? '',
          })
        }
      } else {
        // Neue KVA: nächste laufende Nummer holen
        const { data: row } = await getSupabase().rpc('nextval_kva_nummer')
        if (row != null) {
          const year = new Date().getFullYear()
          setForm(f => ({ ...f, angebotsnr: `KVA-${year}-${String(row).padStart(2, '0')}` }))
        }
      }
    })
  }, [router])

  if (!auth) return null

  async function sendEmail() {
    if (!emailTo) return
    setSending(true)
    setSendResult(null)
    try {
      const mod = await import('html2pdf.js')
      const html2pdfFn = (mod.default ?? mod) as any
      const el = docRef.current!
      const pdfBlob: Blob = await html2pdfFn().set({
        margin: [15, 18, 15, 18],
        filename: 'Kostenvoranschlag.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(el).outputPdf('blob')
      const arrayBuffer = await pdfBlob.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
      const base64 = btoa(binary)
      const res = await fetch('/api/send-kva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo, klient: form.klient, angebotsnr: form.angebotsnr,
          anmerkungEmail: emailAnmerkung, pdfBase64: base64,
          strasse: form.strasse, plz: form.plz, ort: form.ort,
          datum: form.datum, art: form.art,
          tagessatz: parseFloat(form.tagessatz) || null,
          tage: parseInt(form.tage) || null,
          fahrtkosten: parseFloat(form.fahrtkosten) || null,
          stunden_woche: parseFloat(form.stunden_woche) || null,
          wochen: parseInt(form.wochen) || null,
          stundensatz: parseFloat(form.stundensatz) || null,
          pflegestufe: parseInt(form.pflegestufe) || 0,
          anmerkung: form.anmerkung,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('send-kva error:', body)
      }
      if (res.ok) {
        // In Datenbank speichern / Status auf versendet setzen
        await getSupabase().from('kostenvoranschlaege').upsert({
          angebotsnr: form.angebotsnr,
          klient: form.klient || null,
          strasse: form.strasse || null,
          plz: form.plz || null,
          ort: form.ort || null,
          datum: form.datum,
          art: form.art,
          tagessatz: parseFloat(form.tagessatz) || null,
          tage: parseInt(form.tage) || null,
          fahrtkosten: parseFloat(form.fahrtkosten) || null,
          stunden_woche: parseFloat(form.stunden_woche) || null,
          wochen: parseInt(form.wochen) || null,
          stundensatz: parseFloat(form.stundensatz) || null,
          pflegestufe: parseInt(form.pflegestufe) || 0,
          anmerkung: form.anmerkung || null,
          status: 'versendet',
        }, { onConflict: 'angebotsnr' })
      }
      setSendResult(res.ok ? 'ok' : 'err')
    } catch (e) {
      console.error('sendEmail error:', e)
      setSendResult('err')
    }
    setSending(false)
  }

  const f = form
  const tage = parseFloat(f.tage) || 0
  const tagessatz = parseFloat(f.tagessatz) || 0
  const fahrtkostenBetrag = parseFloat(f.fahrtkosten) || 0
  const stundenWoche = parseFloat(f.stunden_woche) || 0
  const wochen = parseFloat(f.wochen) || 0
  const stundensatz = parseFloat(f.stundensatz) || 0
  const pflegestufe = parseInt(f.pflegestufe) || 0

  const betreuungskosten = f.art === '24h' ? tage * tagessatz : stundenWoche * wochen * stundensatz
  const pflegegeld = pflegestufe >= 1 ? PFLEGEGELD[pflegestufe] : 0
  const bundesfoerderung = pflegestufe >= 3 ? BUNDESFOERDERUNG : 0

  const summeKosten = betreuungskosten + PAUSCHALE + (fahrtkostenBetrag > 0 ? fahrtkostenBetrag : 0)
  const summeAbzuege = pflegegeld + bundesfoerderung
  const gesamt = summeKosten - summeAbzuege

  const datumFormatiert = new Date(f.datum + 'T00:00:00').toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const inp: React.CSSProperties = { padding: '9px 12px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box', fontFamily: 'Georgia, serif', background: '#fff' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      {emailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,24,20,.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '28px 26px', width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)' }}>
            {sendResult === 'ok' ? (
              <>
                <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
                  <div style={{ fontSize: 44, marginBottom: 16 }}>✓</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--dark)', marginBottom: 10 }}>E-Mail gesendet</div>
                  <div style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.6 }}>
                    Der Kostenvoranschlag wurde erfolgreich an<br /><strong style={{ color: 'var(--dark)' }}>{emailTo}</strong><br />verschickt.
                  </div>
                </div>
                <button onClick={() => { setEmailModal(false); setSendResult(null); setEmailTo(''); setEmailAnmerkung('') }}
                  style={{ width: '100%', padding: '13px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 16px var(--rose-glow)' }}>
                  Schließen
                </button>
              </>
            ) : (
              <>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--dark)', marginBottom: 18 }}>Per E-Mail senden</div>
                <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 16, lineHeight: 1.6 }}>
                  Das PDF wird automatisch erstellt und als Anhang verschickt. Absender: <strong>office@karohilft.at</strong>
                </div>
                <label style={{ fontSize: 13, color: 'var(--mid)', display: 'block', marginBottom: 12 }}>E-Mail-Adresse *
                  <input type="email" placeholder="empfaenger@beispiel.at" value={emailTo} onChange={e => setEmailTo(e.target.value)}
                    style={{ display: 'block', marginTop: 4, width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 8, fontSize: 14, fontFamily: 'Georgia,serif' }} />
                </label>
                <label style={{ fontSize: 13, color: 'var(--mid)', display: 'block', marginBottom: 20 }}>Individuelle Anmerkung (optional)
                  <textarea placeholder="z.B. Bitte um Rückmeldung bis…" value={emailAnmerkung} onChange={e => setEmailAnmerkung(e.target.value)} rows={3}
                    style={{ display: 'block', marginTop: 4, width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 8, fontSize: 14, fontFamily: 'Georgia,serif', resize: 'vertical' }} />
                </label>
                {sendResult === 'err' && <div style={{ color: '#c0392b', fontSize: 14, marginBottom: 12 }}>Fehler beim Senden. Bitte erneut versuchen.</div>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setEmailModal(false); setSendResult(null) }}
                    style={{ flex: 1, padding: '11px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: 'transparent', color: 'var(--mid)', fontSize: 14, cursor: 'pointer' }}>
                    Abbrechen
                  </button>
                  <button onClick={sendEmail} disabled={sending || !emailTo}
                    style={{ flex: 2, padding: '11px', borderRadius: 'var(--r-pill)', border: 'none', background: sending || !emailTo ? 'rgba(196,120,90,.4)' : 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, fontSize: 14, cursor: sending || !emailTo ? 'default' : 'pointer', boxShadow: sending || !emailTo ? 'none' : '0 4px 16px var(--rose-glow)' }}>
                    {sending ? 'Wird gesendet…' : 'Senden'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm 18mm; }
          html, body { margin: 0; padding: 0; background: #fff !important; }
          .no-print { display: none !important; }
          .print-doc { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; }
        }
        @media (max-width: 900px) { .kva-layout { flex-direction: column !important; } }
      `}</style>

      <div className="no-print" style={{ maxWidth: 1140, margin: '0 auto 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0 }}>←</button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0 }}>Kostenvoranschlag</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button onClick={() => { setEmailModal(true); setSendResult(null) }}
            style={{ padding: '9px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--rose)', background: 'transparent', color: 'var(--rose)', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>
            Per E-Mail senden
          </button>
          <button onClick={() => window.print()} style={{ padding: '9px 22px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px var(--rose-glow)' }}>
            Als PDF drucken
          </button>
        </div>
      </div>

      <div className="kva-layout" style={{ maxWidth: 1140, margin: '0 auto', display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* Formular */}
        <div className="no-print" style={{ flex: '0 0 330px', background: '#fff', borderRadius: 'var(--r-lg)', padding: '22px 20px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 1 }}>Art der Betreuung</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['24h', 'stunden'] as const).map(art => (
                <button key={art} onClick={() => setForm(f => ({ ...f, art }))} style={{ flex: 1, padding: '8px 0', borderRadius: 'var(--r-pill)', border: '1.5px solid', borderColor: form.art === art ? 'var(--rose)' : 'rgba(28,24,20,.12)', background: form.art === art ? 'var(--rose)' : '#fff', color: form.art === art ? '#fff' : 'var(--mid)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  {art === '24h' ? '24h-Betreuung' : 'Stundenbetreuung'}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Klient</div>
            <input placeholder="Name des Klienten *" value={f.klient} onChange={e => setForm(f => ({ ...f, klient: e.target.value }))} style={inp} />
            <input placeholder="Straße und Hausnummer" value={f.strasse} onChange={e => setForm(f => ({ ...f, strasse: e.target.value }))} style={inp} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="PLZ" value={f.plz} onChange={e => setForm(f => ({ ...f, plz: e.target.value }))} style={{ ...inp, width: 90, flex: 'none' }} />
              <input placeholder="Ort" value={f.ort} onChange={e => setForm(f => ({ ...f, ort: e.target.value }))} style={{ ...inp, flex: 1 }} />
            </div>
            <input placeholder="Angebots-Nr." value={f.angebotsnr} onChange={e => setForm(f => ({ ...f, angebotsnr: e.target.value }))} style={inp} />
            <label style={{ fontSize: 13, color: 'var(--mid)' }}>Datum
              <input type="date" value={f.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} style={{ ...inp, marginTop: 4 }} />
            </label>

            {f.art === '24h' ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>24h-Betreuung</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={{ fontSize: 13, color: 'var(--mid)' }}>Tagessatz (€)
                    <input type="number" placeholder="75" value={f.tagessatz} onChange={e => setForm(f => ({ ...f, tagessatz: e.target.value }))} style={{ ...inp, marginTop: 4 }} />
                  </label>
                  <label style={{ fontSize: 13, color: 'var(--mid)' }}>Tage / Monat
                    <input type="number" placeholder="30" value={f.tage} onChange={e => setForm(f => ({ ...f, tage: e.target.value }))} style={{ ...inp, marginTop: 4 }} />
                  </label>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Stundenbetreuung</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <label style={{ fontSize: 13, color: 'var(--mid)' }}>Std/Wo
                    <input type="number" placeholder="20" value={f.stunden_woche} onChange={e => setForm(f => ({ ...f, stunden_woche: e.target.value }))} style={{ ...inp, marginTop: 4 }} />
                  </label>
                  <label style={{ fontSize: 13, color: 'var(--mid)' }}>Wochen
                    <input type="number" placeholder="4" value={f.wochen} onChange={e => setForm(f => ({ ...f, wochen: e.target.value }))} style={{ ...inp, marginTop: 4 }} />
                  </label>
                  <label style={{ fontSize: 13, color: 'var(--mid)' }}>€/Std
                    <input type="number" placeholder="15" value={f.stundensatz} onChange={e => setForm(f => ({ ...f, stundensatz: e.target.value }))} style={{ ...inp, marginTop: 4 }} />
                  </label>
                </div>
              </>
            )}

            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Fahrtkosten</div>
            <label style={{ fontSize: 13, color: 'var(--mid)' }}>Pauschale (€, leer = keine)
              <input type="number" placeholder="0" value={f.fahrtkosten} onChange={e => setForm(f => ({ ...f, fahrtkosten: e.target.value }))} style={{ ...inp, marginTop: 4 }} />
            </label>

            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Abzüge</div>
            <label style={{ fontSize: 13, color: 'var(--mid)' }}>Pflegestufe
              <select value={f.pflegestufe} onChange={e => setForm(f => ({ ...f, pflegestufe: e.target.value }))} style={{ ...inp, marginTop: 4 }}>
                <option value="0">Keine</option>
                {[1,2,3,4,5,6,7].map(s => (
                  <option key={s} value={s}>Stufe {s} – {fmt(PFLEGEGELD[s])}</option>
                ))}
              </select>
            </label>
            {pflegestufe >= 3 && (
              <div style={{ fontSize: 12, color: '#6b8f70', fontStyle: 'italic', marginTop: -6 }}>
                + Bundesförderung 24h-Betreuung: −{fmt(BUNDESFOERDERUNG)} wird automatisch abgezogen
              </div>
            )}

            <label style={{ fontSize: 13, color: 'var(--mid)', marginTop: 4 }}>Anmerkung (optional)
              <textarea placeholder="z.B. individuelle Vereinbarungen…" value={f.anmerkung} onChange={e => setForm(f => ({ ...f, anmerkung: e.target.value }))} rows={3} style={{ ...inp, marginTop: 4, resize: 'vertical' }} />
            </label>
          </div>
        </div>

        {/* Dokument-Vorschau */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div ref={docRef} className="print-doc" style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '44px 48px', boxShadow: 'var(--shadow-md)', fontFamily: 'Georgia, serif', color: '#1C1814' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
              <img src={LOGO_PNG} alt="Karohilft" style={{ height: 52 }} />
              <div style={{ textAlign: 'right', fontSize: 12, color: '#6b6560', lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600, color: '#1C1814', fontSize: 13 }}>Karohilft</div>
                <div>+43 677 61482115</div>
                <div>office@karohilft.at</div>
                <div>www.karohilft.at</div>
              </div>
            </div>

            <div style={{ height: 2, background: 'linear-gradient(90deg, #C4785A, #FAF5EE)', borderRadius: 1, marginBottom: 32 }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 400, fontStyle: 'italic', color: '#C4785A', marginBottom: 6 }}>Kostenvoranschlag</div>
                <div style={{ fontSize: 13, color: '#6b6560' }}>{f.art === '24h' ? '24h-Betreuung (Personenbetreuung)' : 'Stundenbetreuung'}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 13, color: '#6b6560', lineHeight: 1.8 }}>
                {f.angebotsnr && <div><span style={{ color: '#1C1814', fontWeight: 600 }}>Nr.:</span> {f.angebotsnr}</div>}
                <div><span style={{ color: '#1C1814', fontWeight: 600 }}>Datum:</span> {datumFormatiert}</div>
              </div>
            </div>

            {(f.klient || f.strasse || f.plz || f.ort) && (
              <div style={{ background: '#FAF5EE', borderRadius: 10, padding: '14px 18px', marginBottom: 28, fontSize: 14 }}>
                <div style={{ fontSize: 11, color: '#a09a94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Für</div>
                {f.klient && <div style={{ fontWeight: 600, fontSize: 16, color: '#1C1814' }}>{f.klient}</div>}
                {f.strasse && <div style={{ color: '#6b6560', marginTop: 2 }}>{f.strasse}</div>}
                {(f.plz || f.ort) && <div style={{ color: '#6b6560' }}>{[f.plz, f.ort].filter(Boolean).join(' ')}</div>}
              </div>
            )}

            {/* Kosten */}
            <div style={{ fontSize: 11, color: '#a09a94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, fontFamily: 'Georgia, serif' }}>Kosten</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 0 }}>
              <tbody>
                {f.art === '24h' ? (
                  <tr style={{ borderBottom: '1px solid #f0ebe3' }}>
                    <td style={{ padding: '11px 0' }}>
                      <div style={{ fontWeight: 600, color: '#1C1814' }}>Betreuungskosten (24h-Personenbetreuung)</div>
                      <div style={{ fontSize: 12, color: '#6b6560', marginTop: 2 }}>
                        {tage} Tage × {fmt(tagessatz)}/Tag · selbstständige Betreuungsperson (SVS eigenverantwortlich)
                      </div>
                    </td>
                    <td style={{ padding: '11px 0', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{fmt(betreuungskosten)}</td>
                  </tr>
                ) : (
                  <tr style={{ borderBottom: '1px solid #f0ebe3' }}>
                    <td style={{ padding: '11px 0' }}>
                      <div style={{ fontWeight: 600, color: '#1C1814' }}>Betreuungskosten (Stundenbetreuung)</div>
                      <div style={{ fontSize: 12, color: '#6b6560', marginTop: 2 }}>
                        {stundenWoche} Std/Woche × {wochen} Wochen × {fmt(stundensatz)}/Std
                      </div>
                    </td>
                    <td style={{ padding: '11px 0', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{fmt(betreuungskosten)}</td>
                  </tr>
                )}

                <tr style={{ borderBottom: '1px solid #f0ebe3' }}>
                  <td style={{ padding: '11px 0' }}>
                    <div style={{ fontWeight: 600, color: '#1C1814' }}>Karohilft Servicepauschale</div>
                    <div style={{ fontSize: 12, color: '#6b6560', marginTop: 2 }}>Vermittlung, Betreuung & Organisation · monatlich</div>
                  </td>
                  <td style={{ padding: '11px 0', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{fmt(PAUSCHALE)}</td>
                </tr>

                {fahrtkostenBetrag > 0 && (
                  <tr style={{ borderBottom: '1px solid #f0ebe3' }}>
                    <td style={{ padding: '11px 0' }}>
                      <div style={{ fontWeight: 600, color: '#1C1814' }}>Fahrtkosten</div>
                      <div style={{ fontSize: 12, color: '#6b6560', marginTop: 2 }}>Fahrtkosten pauschal</div>
                    </td>
                    <td style={{ padding: '11px 0', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{fmt(fahrtkostenBetrag)}</td>
                  </tr>
                )}

                {/* Subtotal */}
                <tr style={{ background: '#faf5ee' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1C1814', fontSize: 13 }}>Summe Kosten</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#1C1814', fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(summeKosten)}</td>
                </tr>
              </tbody>
            </table>

            {/* Abzüge */}
            {(pflegegeld > 0 || bundesfoerderung > 0) && (
              <>
                <div style={{ fontSize: 11, color: '#a09a94', textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 6, fontFamily: 'Georgia, serif' }}>Abzüge</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 0 }}>
                  <tbody>
                    {pflegegeld > 0 && (
                      <tr style={{ borderBottom: '1px solid #f0ebe3' }}>
                        <td style={{ padding: '11px 0' }}>
                          <div style={{ fontWeight: 600, color: '#1C1814' }}>Pflegegeld Stufe {pflegestufe}</div>
                          <div style={{ fontSize: 12, color: '#6b6560', marginTop: 2 }}>Österreichisches Pflegegeld 2025</div>
                        </td>
                        <td style={{ padding: '11px 0', textAlign: 'right', fontWeight: 600, color: '#6b8f70', whiteSpace: 'nowrap', verticalAlign: 'top' }}>−{fmt(pflegegeld)}</td>
                      </tr>
                    )}
                    {bundesfoerderung > 0 && (
                      <tr style={{ borderBottom: '1px solid #f0ebe3' }}>
                        <td style={{ padding: '11px 0' }}>
                          <div style={{ fontWeight: 600, color: '#1C1814' }}>Bundesförderung 24h-Betreuung</div>
                          <div style={{ fontSize: 12, color: '#6b6560', marginTop: 2 }}>Ab Pflegestufe 3 · einmal monatlich</div>
                        </td>
                        <td style={{ padding: '11px 0', textAlign: 'right', fontWeight: 600, color: '#6b8f70', whiteSpace: 'nowrap', verticalAlign: 'top' }}>−{fmt(bundesfoerderung)}</td>
                      </tr>
                    )}
                    <tr style={{ background: '#f0f7f2' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#4a7a58', fontSize: 13 }}>Summe Abzüge</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#4a7a58', fontSize: 13, whiteSpace: 'nowrap' }}>−{fmt(summeAbzuege)}</td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}

            {/* Gesamtkosten */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 12 }}>
              <tfoot>
                <tr>
                  <td style={{ padding: '16px 0 4px', borderTop: '2px solid #1C1814' }}>
                    <div style={{ fontWeight: 600, fontSize: 17, color: '#1C1814' }}>Gesamtkosten pro Monat</div>
                  </td>
                  <td style={{ padding: '16px 0 4px', borderTop: '2px solid #1C1814', textAlign: 'right', verticalAlign: 'top' }}>
                    <div style={{ fontSize: 24, fontWeight: 600, color: '#C4785A' }}>{fmt(gesamt)}</div>
                  </td>
                </tr>
              </tfoot>
            </table>

            <div style={{ background: '#FAF5EE', borderRadius: 10, padding: '14px 18px', marginTop: 24, fontSize: 12, color: '#6b6560', lineHeight: 1.7 }}>
              <strong style={{ color: '#1C1814' }}>Hinweis:</strong> Die Betreuungsperson ist selbstständig im Personalgewerbe tätig und beim SVS (Sozialversicherungsanstalt der Selbstständigen) versichert. Die Sozialversicherungsbeiträge werden eigenverantwortlich von der Betreuungsperson getragen.
            </div>

            {f.anmerkung && (
              <div style={{ marginTop: 16, fontSize: 13, color: '#6b6560', lineHeight: 1.7 }}>
                <strong style={{ color: '#1C1814' }}>Anmerkung:</strong> {f.anmerkung}
              </div>
            )}

            <div style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid #f0ebe3', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a09a94' }}>
              <div>Karohilft · office@karohilft.at · www.karohilft.at</div>
              <div style={{ fontStyle: 'italic' }}>Verlässlich an Ihrer Seite.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
