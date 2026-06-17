import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'
import { hm } from '../../lib/time'

type Entry = { id: string; client_id: string; datum: string; zeit_von: string; zeit_bis: string; ort: string | null }
type Rule = { id: string; client_id: string; weekdays: number[]; zeit_von: string; zeit_bis: string; ort: string | null; start_date: string }
type Client = { id: string; name: string; street: string; zip: string; city: string }
type Exception = { rule_id: string; datum: string }

type Activity = { client_id: string; datum: string }

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [showAll, setShowAll] = useState(false)
  const [caregiverId, setCaregiverId] = useState<string | null>(null)
  const [caregiverName, setCaregiverName] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load(cgId: string) {
    const today = todayStr()
    const until = addDays(today, 13)
    const [{ data: sched }, { data: rls }, { data: cls }, { data: exc }, { data: acts }] = await Promise.all([
      getSupabase().from('schedule').select('id,client_id,datum,zeit_von,zeit_bis,ort').eq('caregiver_id', cgId).gte('datum', today).lte('datum', until).order('datum').order('zeit_von'),
      getSupabase().from('schedule_rules').select('id,client_id,weekdays,zeit_von,zeit_bis,ort,start_date').eq('caregiver_id', cgId),
      getSupabase().from('clients').select('id,name,street,zip,city'),
      getSupabase().from('schedule_exceptions').select('rule_id,datum'),
      getSupabase().from('activities').select('client_id,datum').eq('caregiver_id', cgId).gte('datum', today).lte('datum', until),
    ])
    setEntries((sched as any) || [])
    setRules((rls as any) || [])
    setClients((cls as any) || [])
    setExceptions((exc as any) || [])
    setActivities((acts as any) || [])
    setLoading(false)
  }

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const sessionEmail = data.session.user.email
      const { data: cg } = await getSupabase().from('caregivers').select('id,name').eq('email', sessionEmail).single()
      if (!cg) { setLoading(false); return }
      setCaregiverId(cg.id)
      setCaregiverName(cg.name)
      await load(cg.id)
    })
  }, [router])

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || '–'
  const clientAddress = (id: string) => { const c = clients.find(c => c.id === id); return c ? [c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') : '' }
  const isCompleted = (clientId: string, datum: string) => activities.some(a => a.client_id === clientId && a.datum === datum)
  const today = todayStr()

  type Item = { client_id: string; client: string; zeit_von: string; zeit_bis: string; ort: string | null; kind: 'schedule' | 'rule'; sourceId: string }

  const days: { datum: string; items: Item[] }[] = []
  for (let i = 0; i < 14; i++) {
    const datum = addDays(today, i)
    const items: Item[] = []
    for (const e of entries.filter(e => e.datum === datum)) {
      if (isCompleted(e.client_id, datum)) continue
      items.push({ client_id: e.client_id, client: clientName(e.client_id), zeit_von: e.zeit_von, zeit_bis: e.zeit_bis, ort: e.ort, kind: 'schedule', sourceId: e.id })
    }
    for (const r of rules.filter(r => r.start_date <= datum && r.weekdays.includes(weekdayOf(datum)) && !exceptions.some(ex => ex.rule_id === r.id && ex.datum === datum))) {
      if (isCompleted(r.client_id, datum)) continue
      items.push({ client_id: r.client_id, client: clientName(r.client_id), zeit_von: r.zeit_von, zeit_bis: r.zeit_bis, ort: r.ort, kind: 'rule', sourceId: r.id })
    }
    items.sort((a, b) => a.zeit_von.localeCompare(b.zeit_von))
    if (items.length > 0) days.push({ datum, items })
  }

  const visibleDays = showAll ? days : days.slice(0, 3)

  async function cancel(datum: string, it: Item) {
    if (!confirm(`Einsatz am ${fmtDate(datum)} (${hm(it.zeit_von)}–${hm(it.zeit_bis)}, ${it.client}) wirklich stornieren?\n\nDer Einsatz wird als "Noch zu vergeben" markiert und der Admin wird informiert.`)) return
    setCancelling(`${datum}-${it.kind}-${it.sourceId}`)
    let err
    if (it.kind === 'schedule') {
      const r = await getSupabase().from('schedule').update({ caregiver_id: null, cancelled_by: caregiverName, cancelled_at: new Date().toISOString() }).eq('id', it.sourceId)
      err = r.error
    } else {
      const r1 = await getSupabase().from('schedule_exceptions').insert({ rule_id: it.sourceId, datum })
      const r2 = await getSupabase().from('schedule').insert({ caregiver_id: null, client_id: it.client_id, datum, zeit_von: it.zeit_von, zeit_bis: it.zeit_bis, ort: it.ort, cancelled_by: caregiverName, cancelled_at: new Date().toISOString() })
      err = r1.error || r2.error
    }
    if (err) {
      alert('Fehler beim Stornieren: ' + err.message)
      setCancelling(null)
      return
    }
    const notifyRes = await fetch('/api/notify-cancellation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caregiver_name: caregiverName, client_name: it.client, datum, zeit_von: it.zeit_von, zeit_bis: it.zeit_bis }),
    })
    const notifyData = await notifyRes.json()
    if (notifyData.skipped || notifyData.success === false) alert('E-Mail-Benachrichtigung: ' + JSON.stringify(notifyData))
    if (caregiverId) await load(caregiverId)
    setCancelling(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, minWidth: 0, overflow: 'hidden' }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 }}>←</button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Meine Einsätze</h1>
        </div>

        {days.length === 0
          ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 40, textAlign: 'center', color: 'var(--mid)' }}>Keine kommenden Termine in den nächsten 14 Tagen.</div>
          : visibleDays.map(({ datum, items }) => (
            <div key={datum} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15, marginBottom: 6 }}>{datum === today ? 'Heute' : fmtDate(datum)}</div>
              {items.map((it, i) => {
                const key = `${datum}-${i}`
                const isExpanded = expanded === key
                const addr = clientAddress(it.client_id)
                return (
                <div key={i} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '12px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div onClick={() => setExpanded(isExpanded ? null : key)}
                      style={{ cursor: 'pointer', flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{hm(it.zeit_von)}–{hm(it.zeit_bis)} · {it.client}</div>
                      {it.ort && <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>{it.ort}</div>}
                    </div>
                    <button onClick={() => cancel(datum, it)} disabled={cancelling === `${datum}-${it.kind}-${it.sourceId}`}
                      style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(192,57,43,.3)', background: '#fff', color: '#C0392B', fontSize: 12, fontWeight: 500, cursor: 'pointer', opacity: cancelling ? 0.6 : 1 }}>
                      Stornieren
                    </button>
                  </div>
                  {isExpanded && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(28,24,20,.08)' }}>
                      {addr && <div style={{ fontSize: 13, color: 'var(--dark)', marginBottom: 6 }}>📍 {addr}</div>}
                      {datum <= today && (
                        <button onClick={() => router.push({ pathname: '/betreuer/eintrag', query: { client_id: it.client_id, client_name: it.client, zeit_von: it.zeit_von, zeit_bis: it.zeit_bis, datum } })}
                          style={{ width: '100%', padding: '10px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px var(--rose-glow)' }}>
                          Eintrag erfassen
                        </button>
                      )}
                      {datum > today && <div style={{ fontSize: 12, color: 'var(--mid)', fontStyle: 'italic' }}>Erst am {fmtDate(datum)} abschließbar</div>}
                    </div>
                  )}
                </div>
                )
              })}
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
