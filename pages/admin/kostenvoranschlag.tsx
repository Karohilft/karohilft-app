import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

const LOGO_PNG = 'data:image/png;base64,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'

const PAUSCHALE = 280dmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iRWJlbmVfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMTEuOCAxMTMuNCI+CiAgPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI5LjMuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDIuMS4wIEJ1aWxkIDE1MSkgIC0tPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuc3QwIHsKICAgICAgICBzdHJva2U6ICNlODQ5Mjg7CiAgICAgIH0KCiAgICAgIC5zdDAsIC5zdDEgewogICAgICAgIGZpbGw6IG5vbmU7CiAgICAgICAgc3Ryb2tlLW1pdGVybGltaXQ6IDEwOwogICAgICB9CgogICAgICAuc3QyIHsKICAgICAgICBmaWxsOiAjY2M5Mzc1OwogICAgICB9CgogICAgICAuc3QxIHsKICAgICAgICBzdHJva2U6ICMwMTAxMDE7CiAgICAgICAgc3Ryb2tlLXdpZHRoOiAuNXB4OwogICAgICB9CgogICAgICAuc3QzIHsKICAgICAgICBmaWxsOiAjODliM2FjOwogICAgICB9CiAgICA8L3N0eWxlPgogIDwvZGVmcz4KICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTU2LjcsNTcuNyIvPgogIDxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0xNTYuNyw1Ny43Ii8+CiAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTE1Ni43LDU3LjciLz4KICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMTU2LjcsNTcuNyIvPgogIDxwYXRoIGNsYXNzPSJzdDIiIGQ9Ik05MC40LDUwLjRMNDkuNCw4LjdzLTIuNi0zLjItNS42LDBMNC4zLDQ4LjhzLTQuMSwzLjUsMCw0LjVoMTMuMnYzNC41cy0uNSwyLjQsMi4yLDIuNGg1My4zczIuOC4yLDIuOC0zLjF2LTMzLjhoMTMuMnMzLjMsMCwxLjQtMi44Wk00Ni45LDgyLjljLTE1LTYuOC0xOC4xLTEwLjgtMTguMS0xOCwuNC04LjYsOC42LTguOSw4LjYtOC45LDUuOSwwLDkuNSw1LjIsOS41LDUuMiwwLDAsMy42LTUuMyw5LjUtNS4yLDAsMCw4LjIuMyw4LjYsOC45LDAsNy4yLTMuMSwxMS4yLTE4LjEsMThaIi8+CiAgPHBhdGggY2xhc3M9InN0MyIgZD0iTTIxMi44LDY2LjdjLS44LTItMi0zLjctMy41LTUuMi0xLjUtMS41LTMuMy0yLjctNS40LTMuNS0yLjEtLjktNC4zLTEuMy02LjgtMS4zcy00LjcuNC02LjgsMS4yYy0yLjEuOC00LDItNS42LDMuNS0xLjYsMS41LTIuOCwzLjMtMy44LDUuNS0uOSwyLjEtMS40LDQuNS0xLjQsNy4xcy40LDQuMywxLjIsNi4zYy44LDIsMiwzLjcsMy41LDUuMiwxLjUsMS41LDMuMywyLjcsNS41LDMuNSwyLjEuOSw0LjUsMS4zLDcuMSwxLjNzNC41LS40LDYuNi0xLjJjMi4xLS44LDMuOS0xLjksNS41LTMuNCwxLjYtMS41LDIuOC0zLjMsMy44LTUuNC45LTIuMSwxLjQtNC41LDEuNC03LjJzLS40LTQuMy0xLjItNi4zWk0xOTYuOCw4OC41Yy0zLjgsMC02LjktNi43LTYuOS0xNXMzLjEtMTUsNi45LTE1LDYuOSw2LjcsNi45LDE1LTMuMSwxNS02LjksMTVaIi8+CiAgPHBhdGggY2xhc3M9InN0MyIgZD0iTTE2MC40LDU4LjJ2NS4xczIuOS02LjUsMTAuMS02LjZjNy4yLS4xLDcuNSw3LjYsNy41LDcuNiwwLDAsMS4xLDktNi4yLDguOS03LjMsMC01LjItNy4zLTUuMi03LjMsMCwwLDEuMi00LjMsMS4xLTQuNi0uMi0yLjQtMy44LDEtNSwyLjMtMS4yLDEuMy0yLjIsMy42LTIuMiw1LjJzMCwyMC4xLDAsMjAuOC0xMS43LjgtMTEuNy4xLDAtMjMuNiwwLTI3LjJjMC0zLjUsMTEuNi01LjIsMTEuNi00LjNaIi8+CiAgPHBhdGggY2xhc3M9InN0MyIgZD0iTTE0NS43LDY4LjhjMC0xLjYtLjQtOC43LTUuMi0xMC44LTMuNS0xLjUtNy44LTEuMy0xMC45LTEuM3MtMy4yLjItNC43LjctMS41LjUtMi45LDEuMS00LDEuOS0xLjIuOC0yLjEsMS43LTIuOCwyLjhjLS43LDEuMS0xLjEsMi4yLTEuMSwzLjRzLjQsNS4xLDQuNiw1LjJjMi40LDAsNC43LTEuNiw0LjgtMy42LjItMS43LS42LTIuNC0xLjMtMy41LS43LTEuMSwxLjctNCwzLjktNCwzLjksMCw1LjksMi41LDUuOSw3LjV2M2MtMTIuNywyLjMtMTkuMSw2LjYtMTkuMSwxMi45cy42LDQuNCwxLjksNS41YzEuMywxLjIsMy4zLDEuNyw2LDEuNyw0LDAsNy42LTEuNiwxMS4yLTQuOCwwLDIuMywwLDMuOCwwLDQsMCwuNywxMC45LjYsMTAuOC0uMSwwLS43LDAtMTkuMywwLTIwLjhaTTEyOC45LDg1LjhjLTEuMSwwLTMuOC0xLTMuOC00LjMuNC00LjgsOS45LTksOS45LTguNXMxLjEsMTIuNi02LDEyLjhaIi8+CiAgPHBhdGggY2xhc3M9InN0MyIgZD0iTTExOC42LDkyLjNjLTUsMS4yLTgtOC42LTgtOC42LTMtOS42LTguMS0xMS41LTEwLjQtMTEuOCw0LjctMy4zLDEyLTguOSwxMy40LTEyLjkuMi0uNywwLTIuMy0xLTIuNi0xLjQtLjUtMTEuOS0uNi0xMy44LjUtMS43LDEuOSw0LjYsMy43LDQuNiw0LjhzLS40LDEuNS0xLjMsMi42Yy0uOSwxLTEuOSwyLjEtMy4xLDMuMy0xLjIsMS4yLTIuNSwyLjMtMy45LDMuMy0uOC42LTEuNiwxLjItMi4zLDEuNywwLTcuMiwwLTE0LjgsMC0xNS4yLDAtLjgtMTEuOC0uNy0xMS43LjEsMCwuOC4xLDMxLjYuMSwzMi42czExLjYtLjgsMTEuNi00LjcsMC00LjcsMC04LjZjNS45LTMuMiw3LjQsNi4xLDguNiwxMC42LDEuOSwxMy44LDEwLjUsMTIuNSwxMC41LDEyLjUsOC41LTEuNCw2LjctNy4zLDYuNy03LjNaIi8+CiAgPGc+CiAgICA8cGF0aCBjbGFzcz0ic3QyIiBkPSJNMjUzLjYsNTkuM2MxLjgsMCwzLjMtMS40LDMuMy0zLjIsMC0xLjgtMS40LTMuMy0zLjItMy4zLTEuOCwwLTMuMywxLjQtMy4zLDMuMiwwLDEuOCwxLjQsMy4zLDMuMiwzLjNaIi8+CiAgICA8cGF0aCBjbGFzcz0ic3QyIiBkPSJNMzEwLjMsNzUuM2MtLjkuNy02LjIsOC4yLTYuMiw4LjItNS40LDcuNy02LjctMS4xLTYuNy0xLjFsLjUtMTcuMWg3LjJjMCwwLDAtMywwLTNoLTcuNGMwLTEuNC41LTEzLjcuNS0xMy43aC0zLjRjLS40LDQuMS0uNiwxMy42LS42LDEzLjZoLTMuNHMwLDMuMSwwLDMuMWgzLjVzLS43LDEwLjUtLjcsMTAuNWMtNC45LDcuNi0xMCwyLjktMTAsMi45di04LjZjMCwwLDE0LjUtMzAuMyw1LTMxLTkuNS0uNy0xMC41LDIxLTEwLjUsMjF2MTUuNGMtOC4zLDE5LjMtMTAsNS41LTEwLDUuNWwtLjItOS41czEyLjUtMzEuOCwzLjUtMzIuNWMtOC45LS43LTguNywzNy43LTguNywzNy43LDAsMC0xMS41LDIyLjEtOS42LDMuMiwxLjctMTcuMy43LTE2LjkuMS0xNy40LS41LS41LTIuMi0uMi0yLjYsMS40LS43LDIuMy0zLDguNy0zLjUsMTAuM3MtNy45LDEzLjgtOC45LDExLjhjLTEtMiwxLTEyLjIsMS0xMi4yLDAsMCwxLjgtMTIuMS00LjctMTEuNi02LjYuNS0xMC4xLDguMy0xMC4xLDguMyw3LjYtMzAuMSwzLjEtMzEuNS0uMy0zMS41LTUuMywwLTQuNywxMS4yLTQuNywxMS4yLDAsMCwxLjYsMjYuOC0zLjUsMzktLjksMi4xLjMsMi42LDIuOCwyLjQsMi41LS4yLDUuOS0xNi40LDUuOS0xNi40LDAsMCwxLjctNS41LDUuOC05czQuOSwwLDQuNywxLjhjLS4yLDEuOS0xLjksMTYuMy0xLjksMTYuMywwLDAtLjYsNS4zLDMuOCw2LjEsNSwuOSwxMS40LTEzLjMsMTEuNC0xMy4zLS4yLDEwLjMsMS4yLDEyLjYsNS4xLDEzLjQsMy44LjgsOC4yLTcuNSw5LTkuMi42LTEuMywxLTEuMSwxLjEtLjUuMS41LjYsOS41LDUuMiw5LjdzOC4xLTcuNiw5LTkuN2MuOS0yLjEsMS41LTEuNSwxLjQtLjYsMCwuOC0uMiwyNy45LS4yLDI3LjloNC43cy4yLTI1LjYuMi0yNS42YzcuMi43LDkuMy0yLjksOS4zLTIuOSwwLDAtMS40LDkuNiw0LjUsMTAuOSw1LjksMS40LDExLjYtOS4zLDEyLjYtMTEuMXMuOC00LjcsMC00LjFaTTIyMy41LDQ0LjJjMi0zLjgsNCwyLjYuMywyMCwwLDAtMi0xNi44LS4zLTIwWk0yNjYuNSw2Ny44czEuNy0yMS44LDQuMS0yNC4yYzMuOC0zLjksMy4zLDctNC4xLDI0LjJaTTI4Ni42LDQzLjVjMy44LTMuOSwzLjMsNy00LjEsMjQuMiwwLDAsMS43LTIxLjgsNC4xLTI0LjJaIi8+CiAgPC9nPgo8L3N2Zz4='

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
    adresse: '',
    datum: new Date().toISOString().slice(0, 10),
    art: '24h' as '24h' | 'stunden',
    tagessatz: '',
    tage: '30',
    fahrtkosten: '',
    stunden_woche: '',
    wochen: '4',
    stundensatz: '',
    pflegestufe: '0',
    anmerkung: '',
    angebotsnr: `KVA-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
  })

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login')
      else setAuth(true)
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
        body: JSON.stringify({ to: emailTo, klient: form.klient, angebotsnr: form.angebotsnr, anmerkungEmail: emailAnmerkung, pdfBase64: base64 }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('send-kva error:', body)
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
            <input placeholder="Adresse" value={f.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} style={inp} />
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

            {(f.klient || f.adresse) && (
              <div style={{ background: '#FAF5EE', borderRadius: 10, padding: '14px 18px', marginBottom: 28, fontSize: 14 }}>
                <div style={{ fontSize: 11, color: '#a09a94', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Für</div>
                {f.klient && <div style={{ fontWeight: 600, fontSize: 16, color: '#1C1814' }}>{f.klient}</div>}
                {f.adresse && <div style={{ color: '#6b6560', marginTop: 2 }}>{f.adresse}</div>}
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
                    <div style={{ fontSize: 11, color: '#a09a94', marginTop: 2 }}>Gemäß § 6 Abs. 1 Z 27 UStG wird keine Umsatzsteuer berechnet.</div>
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
