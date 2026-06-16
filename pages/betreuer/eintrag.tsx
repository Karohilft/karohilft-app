import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'
import TimeSelect from '../../components/TimeSelect'

type Client = { id: string; name: string }

export default function BetreuerEintrag() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [caregiverId, setCaregiverId] = useState<string | null>(null)
  const [caregiverName, setCaregiverName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ client_id: '', zeit_von: '', zeit_bis: '' })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [signed, setSigned] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [confirmDatum, setConfirmDatum] = useState<string | null>(null)
  const [confirmClientName, setConfirmClientName] = useState<string | null>(null)
  const [notiz, setNotiz] = useState('')
  const [caregiverNoShow, setCaregiverNoShow] = useState(false)
  const today = new Date().toLocaleDateString('de-AT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const todayISO = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!router.isReady) return
    const { client_id, zeit_von, zeit_bis, datum, client_name } = router.query
    if (typeof client_id === 'string' && typeof zeit_von === 'string' && typeof zeit_bis === 'string') {
      setForm({ client_id, zeit_von, zeit_bis })
      if (typeof datum === 'string') setConfirmDatum(datum)
      if (typeof client_name === 'string') setConfirmClientName(client_name)
    }
  }, [router.isReady, router.query])

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const email = data.session.user.email
      const { data: cg } = await getSupabase().from('caregivers').select('id,name').eq('email', email).single()
      if (cg) { setCaregiverId(cg.id); setCaregiverName(cg.name) }
      const { data: cl } = await getSupabase().from('clients').select('id,name').order('name')
      setClients((cl as Client[]) || [])
      setLoading(false)
    })
  }, [router])

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    setDrawing(true)
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const r = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - r.left, e.clientY - r.top)
    e.preventDefault()
  }
  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const r = canvas.getBoundingClientRect()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#1C1814'
    ctx.lineCap = 'round'
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top)
    ctx.stroke()
    setSigned(true)
    e.preventDefault()
  }
  function endDraw() { setDrawing(false) }
  function clearSig() {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setSigned(false)
  }

  async function save() {
    if (!form.client_id || !form.zeit_von || !form.zeit_bis || !signed) return
    setSaving(true)
    const unterschrift = canvasRef.current!.toDataURL()
    const clientName = confirmClientName || clients.find(c => c.id === form.client_id)?.name || null
    await getSupabase().from('activities').insert({
      caregiver_id: caregiverId,
      caregiver_name: caregiverName,
      client_id: form.client_id,
      client_name: clientName,
      datum: confirmDatum || todayISO,
      zeit_von: form.zeit_von,
      zeit_bis: form.zeit_bis,
      unterschrift,
      notiz: notiz || null,
      caregiver_no_show: caregiverNoShow,
    })
    setSaving(false)
    setDone(true)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  if (done) return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--dark)', margin: '0 0 8px' }}>Eingetragen!</h2>
        <p style={{ color: 'var(--mid)' }}>Dein Einsatz wurde gespeichert.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
          <button onClick={() => router.push(confirmDatum ? '/betreuer/plan' : '/betreuer')}
            style={{ padding: '12px 28px', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--rose)', background: '#fff', color: 'var(--rose)', fontSize: 16, cursor: 'pointer' }}>Zurück</button>
          <button onClick={() => { setDone(false); setForm({ client_id: '', zeit_von: '', zeit_bis: '' }); setConfirmDatum(null); setConfirmClientName(null); setNotiz(''); setCaregiverNoShow(false); clearSig() }}
            style={{ padding: '12px 28px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontSize: 16, cursor: 'pointer' }}>Neuer Eintrag</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28, paddingTop: 16, position: 'relative' }}>
          {confirmDatum && (
            <button onClick={() => router.push('/betreuer/plan')} style={{ position: 'absolute', left: 0, top: 16, background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>←</button>
          )}
          <img src="/karohilft-logo.png" alt="Karohilft" style={{ width: 100, marginBottom: 8 }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--dark)', margin: '0 0 4px' }}>{confirmDatum ? 'Einsatz bestätigen' : 'Einsatz eintragen'}</h1>
          <p style={{ color: 'var(--rose)', fontWeight: 500, margin: 0 }}>{confirmDatum ? new Date(confirmDatum + 'T00:00:00').toLocaleDateString('de-AT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : today}</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '24px 20px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'grid', gap: 16 }}>
            {confirmDatum ? (
              <>
                <div style={{ background: 'var(--cream)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 16 }}>{confirmClientName}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, color: 'var(--mid)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Zeit von</label>
                    <TimeSelect value={form.zeit_von} onChange={v => setForm(f => ({ ...f, zeit_von: v }))} style={{ width: '100%', padding: '13px 14px', fontSize: 16, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: 'var(--mid)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Zeit bis</label>
                    <TimeSelect value={form.zeit_bis} onChange={v => setForm(f => ({ ...f, zeit_bis: v }))} style={{ width: '100%', padding: '13px 14px', fontSize: 16, boxSizing: 'border-box' }} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={{ fontSize: 13, color: 'var(--mid)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Klient / Klientin</label>
                  <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} style={{ width: '100%', padding: '13px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 16, background: '#fff' }}>
                    <option value="">Bitte wählen…</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, color: 'var(--mid)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Zeit von</label>
                    <TimeSelect value={form.zeit_von} onChange={v => setForm(f => ({ ...f, zeit_von: v }))} style={{ width: '100%', padding: '13px 14px', fontSize: 16, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: 'var(--mid)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Zeit bis</label>
                    <TimeSelect value={form.zeit_bis} onChange={v => setForm(f => ({ ...f, zeit_bis: v }))} style={{ width: '100%', padding: '13px 14px', fontSize: 16, boxSizing: 'border-box' }} />
                  </div>
                </div>
              </>
            )}

            <button type="button" onClick={() => setCaregiverNoShow(v => !v)}
              style={{ padding: '12px 10px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--rose)', background: caregiverNoShow ? 'var(--rose)' : '#fff', color: caregiverNoShow ? '#fff' : 'var(--rose)', fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'center', transition: 'all .15s' }}>
              Einsatz konnte nicht durchgeführt werden
            </button>

            <div>
              <label style={{ fontSize: 13, color: 'var(--mid)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Notiz (optional)</label>
              <textarea value={notiz} onChange={e => setNotiz(e.target.value)} rows={3} placeholder="z.B. Grund, Besonderheiten…" style={{ width: '100%', padding: '13px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, color: 'var(--mid)', fontWeight: 500 }}>Unterschrift</label>
                {signed && <button onClick={clearSig} style={{ fontSize: 12, color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Löschen</button>}
              </div>
              <canvas ref={canvasRef} width={400} height={120}
                onPointerDown={startDraw} onPointerMove={draw} onPointerUp={endDraw} onPointerLeave={endDraw}
                style={{ width: '100%', height: 120, border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', background: signed ? '#fffef9' : '#fafafa', touchAction: 'none', cursor: 'crosshair' }} />
              {!signed && <p style={{ fontSize: 12, color: 'var(--mid)', margin: '4px 0 0', textAlign: 'center' }}>Bitte hier unterschreiben</p>}
            </div>

            <button onClick={save} disabled={saving || !form.client_id || !form.zeit_von || !form.zeit_bis || !signed}
              style={{ padding: '15px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, fontSize: 16, cursor: 'pointer', opacity: (!form.client_id || !form.zeit_von || !form.zeit_bis || !signed) ? 0.5 : 1, boxShadow: '0 6px 28px var(--rose-glow)', transition: 'all .3s' }}>
              {saving ? 'Speichern…' : 'Einsatz speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
