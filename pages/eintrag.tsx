import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../lib/supabase'
import TimeSelect from '../components/TimeSelect'

type Client = { id: string; name: string }

function calcHours(von: string, bis: string) {
  if (!von || !bis) return 0
  const [hv, mv] = von.split(':').map(Number)
  const [hb, mb] = bis.split(':').map(Number)
  return Math.round(((hb * 60 + mb) - (hv * 60 + mv)) / 60 * 10) / 10
}

export default function EintragPage() {
  const router = useRouter()
  const { k } = router.query
  const [client, setClient] = useState<Client | null>(null)
  const [caregiverId, setCaregiverId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ zeit_von: '', zeit_bis: '' })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [signed, setSigned] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const today = new Date().toLocaleDateString('de-AT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const todayISO = new Date().toISOString().split('T')[0]
  const hours = calcHours(form.zeit_von, form.zeit_bis)

  useEffect(() => {
    if (!k) return
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace(`/login?next=${encodeURIComponent(router.asPath)}`); return }
      const email = data.session.user.email
      const [{ data: cg }, { data: cl }] = await Promise.all([
        getSupabase().from('caregivers').select('id').eq('email', email).single(),
        getSupabase().from('clients').select('id,name').eq('id', k).single(),
      ])
      if (cg) setCaregiverId(cg.id)
      if (cl) setClient(cl as Client)
      setLoading(false)
    })
  }, [k, router])

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    setDrawing(true)
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const r = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo((e.clientX - r.left) * (canvas.width / r.width), (e.clientY - r.top) * (canvas.height / r.height))
    e.preventDefault()
  }
  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const r = canvas.getBoundingClientRect()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = '#1C1814'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo((e.clientX - r.left) * (canvas.width / r.width), (e.clientY - r.top) * (canvas.height / r.height))
    ctx.stroke()
    setSigned(true)
    e.preventDefault()
  }
  function endDraw() { setDrawing(false) }
  function clearSig() {
    canvasRef.current!.getContext('2d')!.clearRect(0, 0, 400, 160)
    setSigned(false)
  }

  async function save() {
    if (!form.zeit_von || !form.zeit_bis || !signed || !client) return
    setSaving(true)
    const unterschrift = canvasRef.current!.toDataURL()
    await getSupabase().from('activities').insert({
      caregiver_id: caregiverId,
      client_id: client.id,
      datum: todayISO,
      zeit_von: form.zeit_von,
      zeit_bis: form.zeit_bis,
      unterschrift,
    })
    setSaving(false)
    setDone(true)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  if (!client) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}><p style={{ color: '#C0392B', textAlign: 'center' }}>Ungültiger QR-Code.</p></div>

  if (done) return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 12, color: 'var(--sage)' }}>✓</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--dark)', margin: '0 0 8px' }}>Eingetragen!</h2>
        <p style={{ color: 'var(--mid)', margin: '0 0 4px' }}>{hours}h bei {client.name}</p>
        <p style={{ color: 'var(--mid)', fontSize: 14 }}>{today}</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24, paddingTop: 16 }}>
          <img src="/karohilft-logo.svg" alt="Karohilft" style={{ width: 100, marginBottom: 8 }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, color: 'var(--dark)', margin: '0 0 4px' }}>Einsatz eintragen</h1>
          <p style={{ color: 'var(--rose)', fontWeight: 500, margin: 0, fontSize: 15 }}>{today}</p>
        </div>

        <div style={{ background: 'rgba(196,124,90,.08)', borderRadius: 'var(--r-md)', padding: '12px 18px', marginBottom: 16, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--mid)' }}>Klient / Klientin</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: 'var(--dark)' }}>{client.name}</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '24px 20px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: 'var(--mid)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Zeit von</label>
                <TimeSelect value={form.zeit_von} onChange={v => setForm(f => ({ ...f, zeit_von: v }))} style={{ fontSize: 16 }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: 'var(--mid)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Zeit bis</label>
                <TimeSelect value={form.zeit_bis} onChange={v => setForm(f => ({ ...f, zeit_bis: v }))} style={{ fontSize: 16 }} />
              </div>
            </div>

            {form.zeit_von && form.zeit_bis && hours > 0 && (
              <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(196,124,90,.06)', borderRadius: 'var(--r-sm)' }}>
                <span style={{ fontSize: 13, color: 'var(--mid)' }}>Dauer: </span>
                <span style={{ fontWeight: 700, color: 'var(--rose)', fontSize: 16 }}>{hours} Stunden</span>
              </div>
            )}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, color: 'var(--mid)', fontWeight: 500 }}>Unterschrift</label>
                {signed && <button onClick={clearSig} style={{ fontSize: 12, color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Löschen</button>}
              </div>
              <canvas ref={canvasRef} width={400} height={160}
                onPointerDown={startDraw} onPointerMove={draw} onPointerUp={endDraw} onPointerLeave={endDraw}
                style={{ width: '100%', height: 120, border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', background: '#fafafa', touchAction: 'none', cursor: 'crosshair', display: 'block' }} />
              {!signed && <p style={{ fontSize: 12, color: 'var(--mid)', margin: '4px 0 0', textAlign: 'center' }}>Bitte hier unterschreiben</p>}
            </div>

            <button onClick={save} disabled={saving || !form.zeit_von || !form.zeit_bis || !signed}
              style={{ padding: '15px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, fontSize: 16, cursor: 'pointer', opacity: (!form.zeit_von || !form.zeit_bis || !signed) ? 0.5 : 1, boxShadow: '0 6px 28px var(--rose-glow)', transition: 'all .3s' }}>
              {saving ? 'Speichern…' : 'Einsatz speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
