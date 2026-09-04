import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

const LOGO_BASE64 = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyBpZD0iRWJlbmVfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMTEuOCAxMTMuNCI+CiAgPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI5LjMuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDIuMS4wIEJ1aWxkIDE1MSkgIC0tPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuc3QwIHsKICAgICAgICBzdHJva2U6ICNlODQ5Mjg7CiAgICAgIH0KCiAgICAgIC5zdDAsIC5zdDEgewogICAgICAgIGZpbGw6IG5vbmU7CiAgICAgICAgc3Ryb2tlLW1pdGVybGltaXQ6IDEwOwogICAgICB9CgogICAgICAuc3QyIHsKICAgICAgICBmaWxsOiAjY2M5Mzc1OwogICAgICB9CgogICAgICAuc3QxIHsKICAgICAgICBzdHJva2U6ICMwMTAxMDE7CiAgICAgICAgc3Ryb2tlLXdpZHRoOiAuNXB4OwogICAgICB9CgogICAgICAuc3QzIHsKICAgICAgICBmaWxsOiAjODliM2FjOwogICAgICB9CiAgICA8L3N0eWxlPgogIDwvZGVmcz4KICA8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTU2LjcsNTcuNyIvPgogIDxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0xNTYuNyw1Ny43Ii8+CiAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTE1Ni43LDU3LjciLz4KICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMTU2LjcsNTcuNyIvPgogIDxwYXRoIGNsYXNzPSJzdDIiIGQ9Ik05MC40LDUwLjRMNDkuNCw4LjdzLTIuNi0zLjItNS42LDBMNC4zLDQ4LjhzLTQuMSwzLjUsMCw0LjVoMTMuMnYzNC41cy0uNSwyLjQsMi4yLDIuNGg1My4zczIuOC4yLDIuOC0zLjF2LTMzLjhoMTMuMnMzLjMsMCwxLjQtMi44Wk00Ni45LDgyLjljLTE1LTYuOC0xOC4xLTEwLjgtMTguMS0xOCwuNC04LjYsOC42LTguOSw4LjYtOC45LDUuOSwwLDkuNSw1LjIsOS41LDUuMiwwLDAsMy42LTUuMyw5LjUtNS4yLDAsMCw4LjIuMyw4LjYsOC45LDAsNy4yLTMuMSwxMS4yLTE4LjEsMThaIi8+CiAgPHBhdGggY2xhc3M9InN0MyIgZD0iTTIxMi44LDY2LjdjLS44LTItMi0zLjctMy41LTUuMi0xLjUtMS41LTMuMy0yLjctNS40LTMuNS0yLjEtLjktNC4zLTEuMy02LjgtMS4zcy00LjcuNC02LjgsMS4yYy0yLjEuOC00LDItNS42LDMuNS0xLjYsMS41LTIuOCwzLjMtMy44LDUuNS0uOSwyLjEtMS40LDQuNS0xLjQsNy4xcy40LDQuMywxLjIsNi4zYy44LDIsMiwzLjcsMy41LDUuMiwxLjUsMS41LDMuMywyLjcsNS41LDMuNSwyLjEuOSw0LjUsMS4zLDcuMSwxLjNzNC41LS40LDYuNi0xLjJjMi4xLS44LDMuOS0xLjksNS41LTMuNCwxLjYtMS41LDIuOC0zLjMsMy44LTUuNC45LTIuMSwxLjQtNC41LDEuNC03LjJzLS40LTQuMy0xLjItNi4zWk0xOTYuOCw4OC41Yy0zLjgsMC02LjktNi43LTYuOS0xNXMzLjEtMTUsNi45LTE1LDYuOSw2LjcsNi45LDE1LTMuMSwxNS02LjksMTVaIi8+CiAgPHBhdGggY2xhc3M9InN0MyIgZD0iTTE2MC40LDU4LjJ2NS4xczIuOS02LjUsMTAuMS02LjZjNy4yLS4xLDcuNSw3LjYsNy41LDcuNiwwLDAsMS4xLDktNi4yLDguOS03LjMsMC01LjItNy4zLTUuMi03LjMsMCwwLDEuMi00LjMsMS4xLTQuNi0uMi0yLjQtMy44LDEtNSwyLjMtMS4yLDEuMy0yLjIsMy42LTIuMiw1LjJzMCwyMC4xLDAsMjAuOC0xMS43LjgtMTEuNy4xLDAtMjMuNiwwLTI3LjJjMC0zLjUsMTEuNi01LjIsMTEuNi00LjNaIi8+CiAgPHBhdGggY2xhc3M9InN0MyIgZD0iTTE0NS43LDY4LjhjMC0xLjYtLjQtOC43LTUuMi0xMC44LTMuNS0xLjUtNy44LTEuMy0xMC45LTEuM3MtMy4yLjItNC43LjctMS41LjUtMi45LDEuMS00LDEuOS0xLjIuOC0yLjEsMS43LTIuOCwyLjhjLS43LDEuMS0xLjEsMi4yLTEuMSwzLjRzLjQsNS4xLDQuNiw1LjJjMi40LDAsNC43LTEuNiw0LjgtMy42LjItMS43LS42LTIuNC0xLjMtMy41LS43LTEuMSwxLjctNCwzLjktNCwzLjksMCw1LjksMi41LDUuOSw3LjV2M2MtMTIuNywyLjMtMTkuMSw2LjYtMTkuMSwxMi45cy42LDQuNCwxLjksNS41YzEuMywxLjIsMy4zLDEuNyw2LDEuNyw0LDAsNy42LTEuNiwxMS4yLTQuOCwwLDIuMywwLDMuOCwwLDQsMCwuNywxMC45LjYsMTAuOC0uMSwwLS43LDAtMTkuMywwLTIwLjhaTTEyOC45LDg1LjhjLTEuMSwwLTMuOC0xLTMuOC00LjMuNC00LjgsOS45LTksOS45LTguNXMxLjEsMTIuNi02LDEyLjhaIi8+CiAgPHBhdGggY2xhc3M9InN0MyIgZD0iTTExOC42LDkyLjNjLTUsMS4yLTgtOC42LTgtOC42LTMtOS42LTguMS0xMS41LTEwLjQtMTEuOCw0LjctMy4zLDEyLTguOSwxMy40LTEyLjkuMi0uNywwLTIuMy0xLTIuNi0xLjQtLjUtMTEuOS0uNi0xMy44LjUtMS43LDEuOSw0LjYsMy43LDQuNiw0LjhzLS40LDEuNS0xLjMsMi42Yy0uOSwxLTEuOSwyLjEtMy4xLDMuMy0xLjIsMS4yLTIuNSwyLjMtMy45LDMuMy0uOC42LTEuNiwxLjItMi4zLDEuNywwLTcuMiwwLTE0LjgsMC0xNS4yLDAtLjgtMTEuOC0uNy0xMS43LjEsMCwuOC4xLDMxLjYuMSwzMi42czExLjYtLjgsMTEuNi00LjcsMC00LjcsMC04LjZjNS45LTMuMiw3LjQsNi4xLDguNiwxMC42LDEuOSwxMy44LDEwLjUsMTIuNSwxMC41LDEyLjUsOC41LTEuNCw2LjctNy4zLDYuNy03LjNaIi8+CiAgPGc+CiAgICA8cGF0aCBjbGFzcz0ic3QyIiBkPSJNMjUzLjYsNTkuM2MxLjgsMCwzLjMtMS40LDMuMy0zLjIsMC0xLjgtMS40LTMuMy0zLjItMy4zLTEuOCwwLTMuMywxLjQtMy4zLDMuMiwwLDEuOCwxLjQsMy4zLDMuMiwzLjNaIi8+CiAgICA8cGF0aCBjbGFzcz0ic3QyIiBkPSJNMzEwLjMsNzUuM2MtLjkuNy02LjIsOC4yLTYuMiw4LjItNS40LDcuNy02LjctMS4xLTYuNy0xLjFsLjUtMTcuMWg3LjJjMCwwLDAtMywwLTNoLTcuNGMwLTEuNC41LTEzLjcuNS0xMy43aC0zLjRjLS40LDQuMS0uNiwxMy42LS42LDEzLjZoLTMuNHMwLDMuMSwwLDMuMWgzLjVzLS43LDEwLjUtLjcsMTAuNWMtNC45LDcuNi0xMCwyLjktMTAsMi45di04LjZjMCwwLDE0LjUtMzAuMyw1LTMxLTkuNS0uNy0xMC41LDIxLTEwLjUsMjF2MTUuNGMtOC4zLDE5LjMtMTAsNS41LTEwLDUuNWwtLjItOS41czEyLjUtMzEuOCwzLjUtMzIuNWMtOC45LS43LTguNywzNy43LTguNywzNy43LDAsMC0xMS41LDIyLjEtOS42LDMuMiwxLjctMTcuMy43LTE2LjkuMS0xNy40LS41LS41LTIuMi0uMi0yLjYsMS40LS43LDIuMy0zLDguNy0zLjUsMTAuM3MtNy45LDEzLjgtOC45LDExLjhjLTEtMiwxLTEyLjIsMS0xMi4yLDAsMCwxLjgtMTIuMS00LjctMTEuNi02LjYuNS0xMC4xLDguMy0xMC4xLDguMyw3LjYtMzAuMSwzLjEtMzEuNS0uMy0zMS41LTUuMywwLTQuNywxMS4yLTQuNywxMS4yLDAsMCwxLjYsMjYuOC0zLjUsMzktLjksMi4xLjMsMi42LDIuOCwyLjQsMi41LS4yLDUuOS0xNi40LDUuOS0xNi40LDAsMCwxLjctNS41LDUuOC05czQuOSwwLDQuNywxLjhjLS4yLDEuOS0xLjksMTYuMy0xLjksMTYuMywwLDAtLjYsNS4zLDMuOCw2LjEsNSwuOSwxMS40LTEzLjMsMTEuNC0xMy4zLS4yLDEwLjMsMS4yLDEyLjYsNS4xLDEzLjQsMy44LjgsOC4yLTcuNSw5LTkuMi42LTEuMywxLTEuMSwxLjEtLjUuMS41LjYsOS41LDUuMiw5LjdzOC4xLTcuNiw5LTkuN2MuOS0yLjEsMS41LTEuNSwxLjQtLjYsMCwuOC0uMiwyNy45LS4yLDI3LjloNC43cy4yLTI1LjYuMi0yNS42YzcuMi43LDkuMy0yLjksOS4zLTIuOSwwLDAtMS40LDkuNiw0LjUsMTAuOSw1LjksMS40LDExLjYtOS4zLDEyLjYtMTEuMXMuOC00LjcsMC00LjFaTTIyMy41LDQ0LjJjMi0zLjgsNCwyLjYuMywyMCwwLDAtMi0xNi44LS4zLTIwWk0yNjYuNSw2Ny44czEuNy0yMS44LDQuMS0yNC4yYzMuOC0zLjksMy4zLDctNC4xLDI0LjJaTTI4Ni42LDQzLjVjMy44LTMuOSwzLjMsNy00LjEsMjQuMiwwLDAsMS43LTIxLjgsNC4xLTI0LjJaIi8+CiAgPC9nPgo8L3N2Zz4='

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
              <img src={LOGO_BASE64} alt="Karohilft" style={{ height: 52 }} />
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
                    <div style={{ fontSize: 11, color: '#a09a94', marginTop: 2 }}>Alle Beträge inkl. USt. (Kleinunternehmerregelung)</div>
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
