import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

type Activity = {
  id: string
  datum: string
  zeit_von: string
  zeit_bis: string
  unterschrift: string
  caregiver: { name: string } | null
  client: { name: string } | null
}

function calcHours(von: string, bis: string) {
  if (!von || !bis) return 0
  const [hv, mv] = von.split(':').map(Number)
  const [hb, mb] = bis.split(':').map(Number)
  return Math.round(((hb * 60 + mb) - (hv * 60 + mv)) / 60 * 10) / 10
}

export default function AdminStundenplan() {
  const router = useRouter()
  const [entries, setEntries] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCaregiver, setFilterCaregiver] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterMonth, setFilterMonth] = useState('')

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      fetch('/api/admin/me', { headers: { Authorization: `Bearer ${data.session.access_token}` } }).then(r => { if (!r.ok) router.replace('/') })
      getSupabase()
        .from('activities')
        .select('id,datum,zeit_von,zeit_bis,unterschrift,caregiver:caregivers(name),client:clients(name)')
        .order('datum', { ascending: false })
        .then(({ data: d }) => { setEntries((d as any) || []); setLoading(false) })
    })
  }, [router])

  const caregiverNames = [...new Set(entries.map(e => (e.caregiver as any)?.name).filter(Boolean))].sort()
  const clientNames = [...new Set(entries.map(e => (e.client as any)?.name).filter(Boolean))].sort()
  const months = [...new Set(entries.map(e => e.datum?.substring(0, 7)).filter(Boolean))].sort().reverse()

  const filtered = entries.filter(e => {
    if (filterCaregiver && (e.caregiver as any)?.name !== filterCaregiver) return false
    if (filterClient && (e.client as any)?.name !== filterClient) return false
    if (filterMonth && !e.datum?.startsWith(filterMonth)) return false
    return true
  })

  const totalHours = filtered.reduce((s, e) => s + calcHours(e.zeit_von, e.zeit_bis), 0)

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
            <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 }}>←</button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Stundenplan</h1>
          </div>
          <button onClick={() => window.print()} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 10 }}>Drucken</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          <select value={filterCaregiver} onChange={e => setFilterCaregiver(e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 14, background: '#fff' }}>
            <option value="">Alle Betreuer</option>
            {caregiverNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 14, background: '#fff' }}>
            <option value="">Alle Klienten</option>
            {clientNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 14, background: '#fff' }}>
            <option value="">Alle Monate</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {filtered.length === 0
          ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 40, textAlign: 'center', color: 'var(--mid)' }}>Keine Einträge gefunden.</div>
          : (
            <div>
              {filtered.map(e => {
                const h = calcHours(e.zeit_von, e.zeit_bis)
                return (
                  <div key={e.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 16 }}>
                          {(e.caregiver as any)?.name || '–'} → {(e.client as any)?.name || '–'}
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--mid)', marginTop: 3 }}>
                          {e.datum} · {e.zeit_von} – {e.zeit_bis}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--rose)' }}>{h}h</div>
                        {e.unterschrift && <img src={e.unterschrift} alt="Unterschrift" style={{ height: 28, marginTop: 4, opacity: 0.6 }} />}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(196,124,90,.08)', borderRadius: 'var(--r-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--dark)' }}>Gesamt{filterCaregiver || filterClient || filterMonth ? ' (gefiltert)' : ''}:</span>
                <span style={{ fontWeight: 700, fontSize: 22, color: 'var(--rose)' }}>{Math.round(totalHours * 10) / 10}h</span>
              </div>
            </div>
          )}
      </div>
    </div>
  )
}
