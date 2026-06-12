import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

type Entry = { id: string; client_id: string; datum: string; zeit_von: string; zeit_bis: string; ort: string | null }
type Rule = { id: string; client_id: string; weekdays: number[]; zeit_von: string; zeit_bis: string; ort: string | null; start_date: string }
type Client = { id: string; name: string }

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function weekdayOf(dateStr: string) {
  return (new Date(dateStr + 'T00:00:00').getDay() + 6) % 7
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-AT', { weekday: 'long', day: '2-digit', month: '2-digit' })
}

export default function BetreuerPlan() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<Entry[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const sessionEmail = data.session.user.email
      const { data: cg } = await getSupabase().from('caregivers').select('id').eq('email', sessionEmail).single()
      if (!cg) { setLoading(false); return }

      const today = todayStr()
      const until = addDays(today, 13)
      const [{ data: sched }, { data: rls }, { data: cls }] = await Promise.all([
        getSupabase().from('schedule').select('id,client_id,datum,zeit_von,zeit_bis,ort').eq('caregiver_id', cg.id).gte('datum', today).lte('datum', until).order('datum').order('zeit_von'),
        getSupabase().from('schedule_rules').select('id,client_id,weekdays,zeit_von,zeit_bis,ort,start_date').eq('caregiver_id', cg.id),
        getSupabase().from('clients').select('id,name'),
      ])
      setEntries((sched as any) || [])
      setRules((rls as any) || [])
      setClients((cls as any) || [])
      setLoading(false)
    })
  }, [router])

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || '–'
  const today = todayStr()

  const days: { datum: string; items: { client_id: string; client: string; zeit_von: string; zeit_bis: string; ort: string | null }[] }[] = []
  for (let i = 0; i < 14; i++) {
    const datum = addDays(today, i)
    const items: { client_id: string; client: string; zeit_von: string; zeit_bis: string; ort: string | null }[] = []
    for (const e of entries.filter(e => e.datum === datum)) {
      items.push({ client_id: e.client_id, client: clientName(e.client_id), zeit_von: e.zeit_von, zeit_bis: e.zeit_bis, ort: e.ort })
    }
    for (const r of rules.filter(r => r.start_date <= datum && r.weekdays.includes(weekdayOf(datum)))) {
      items.push({ client_id: r.client_id, client: clientName(r.client_id), zeit_von: r.zeit_von, zeit_bis: r.zeit_bis, ort: r.ort })
    }
    items.sort((a, b) => a.zeit_von.localeCompare(b.zeit_von))
    if (items.length > 0) days.push({ datum, items })
  }

  const visibleDays = showAll ? days : days.slice(0, 3)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, minWidth: 0, overflow: 'hidden' }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 }}>←</button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Mein Plan</h1>
        </div>

        {days.length === 0
          ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 40, textAlign: 'center', color: 'var(--mid)' }}>Keine kommenden Termine in den nächsten 14 Tagen.</div>
          : visibleDays.map(({ datum, items }) => (
            <div key={datum} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15, marginBottom: 6 }}>{datum === today ? 'Heute' : fmtDate(datum)}</div>
              {items.map((it, i) => (
                <div key={i} onClick={() => router.push({ pathname: '/betreuer/eintrag', query: { client_id: it.client_id, client_name: it.client, zeit_von: it.zeit_von, zeit_bis: it.zeit_bis, datum } })}
                  style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '12px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{it.zeit_von}–{it.zeit_bis} · {it.client}</div>
                  {it.ort && <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>{it.ort}</div>}
                </div>
              ))}
            </div>
          ))}

        {!showAll && days.length > 3 && (
          <button onClick={() => setShowAll(true)} style={{ width: '100%', padding: '12px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', fontSize: 14, cursor: 'pointer', marginTop: 4 }}>
            Weitere Tage anzeigen
          </button>
        )}
      </div>
    </div>
  )
}
