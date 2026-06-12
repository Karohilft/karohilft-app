import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'
import { hm } from '../../lib/time'

type ScheduleEntry = {
  id: string
  caregiver_id: string
  client_id: string
  zeit_von: string
  zeit_bis: string
  ort: string | null
  caregiver: { name: string } | null
  client: { name: string } | null
}

type ActivityEntry = {
  id: string
  caregiver_id: string | null
  client_id: string | null
  zeit_von: string
  zeit_bis: string
  caregiver: { name: string } | null
  client: { name: string } | null
}

type RuleEntry = {
  id: string
  caregiver_id: string
  client_id: string
  weekdays: number[]
  zeit_von: string
  zeit_bis: string
  ort: string | null
  start_date: string
  caregiver: { name: string } | null
  client: { name: string } | null
}

type UnassignedEntry = {
  id: string
  client_id: string
  datum: string
  zeit_von: string
  zeit_bis: string
  ort: string | null
  cancelled_by: string | null
  cancelled_at: string | null
  client: { name: string } | null
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function weekdayOf(dateStr: string) {
  return (new Date(dateStr + 'T00:00:00').getDay() + 6) % 7
}

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function AdminUebersicht() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [rules, setRules] = useState<RuleEntry[]>([])
  const [unassigned, setUnassigned] = useState<UnassignedEntry[]>([])

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const today = todayStr()
      const [{ data: sched }, { data: acts }, { data: rls }, { data: unas }] = await Promise.all([
        getSupabase().from('schedule').select('id,caregiver_id,client_id,zeit_von,zeit_bis,ort,caregiver:caregivers(name),client:clients(name)').eq('datum', today).order('zeit_von'),
        getSupabase().from('activities').select('id,caregiver_id,client_id,zeit_von,zeit_bis,caregiver:caregivers(name),client:clients(name)').eq('datum', today).order('zeit_von'),
        getSupabase().from('schedule_rules').select('id,caregiver_id,client_id,weekdays,zeit_von,zeit_bis,ort,start_date,caregiver:caregivers(name),client:clients(name)'),
        getSupabase().from('schedule').select('id,client_id,datum,zeit_von,zeit_bis,ort,cancelled_by,cancelled_at,client:clients(name)').is('caregiver_id', null).gte('datum', today).order('datum').order('zeit_von'),
      ])
      setSchedule((sched as any) || [])
      setActivities((acts as any) || [])
      setRules((rls as any) || [])
      setUnassigned((unas as any) || [])
      setLoading(false)
    })
  }, [router])

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  const now = nowTime()

  function isDone(e: ScheduleEntry) {
    return activities.some(a => a.caregiver_id === e.caregiver_id && a.client_id === e.client_id && a.zeit_von === e.zeit_von)
  }

  const today = todayStr()
  const todaysWeekday = weekdayOf(today)
  const ruleEntries: ScheduleEntry[] = rules
    .filter(r => r.start_date <= today && r.weekdays.includes(todaysWeekday))
    .map(r => ({ id: 'rule-' + r.id, caregiver_id: r.caregiver_id, client_id: r.client_id, zeit_von: r.zeit_von, zeit_bis: r.zeit_bis, ort: r.ort, caregiver: r.caregiver, client: r.client }))
  const allEntries = [...schedule, ...ruleEntries].sort((a, b) => a.zeit_von.localeCompare(b.zeit_von))

  const laufend = allEntries.filter(e => !isDone(e) && e.zeit_von <= now && now < e.zeit_bis)
  const offen = allEntries.filter(e => !isDone(e) && now < e.zeit_von)
  const abgeschlossen = allEntries.filter(e => isDone(e))
  const extraAbgeschlossen = activities.filter(a => !allEntries.some(e => e.caregiver_id === a.caregiver_id && e.client_id === a.client_id && e.zeit_von === a.zeit_von))

  function Section({ title, color, items }: { title: string; color: string; items: { id: string; caregiver: string; client: string; zeit_von: string; zeit_bis: string; ort?: string | null }[] }) {
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: 0 }}>{title}</h2>
          <span style={{ fontSize: 13, color: 'var(--mid)' }}>({items.length})</span>
        </div>
        {items.length === 0
          ? <div style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', color: 'var(--mid)', fontSize: 14, boxShadow: 'var(--shadow-sm)' }}>–</div>
          : items.map(e => (
            <div key={e.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '12px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)', borderLeft: `4px solid ${color}` }}>
              <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{hm(e.zeit_von)}–{hm(e.zeit_bis)} · {e.caregiver} → {e.client}</div>
              {e.ort && <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>{e.ort}</div>}
            </div>
          ))}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, minWidth: 0, overflow: 'hidden' }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 }}>←</button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Übersicht heute</h1>
        </div>

        {unassigned.some(e => e.cancelled_by) && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#C0392B', flexShrink: 0 }} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: 0 }}>Kürzlich storniert</h2>
            </div>
            {unassigned.filter(e => e.cancelled_by).map(e => (
              <div key={e.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '12px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)', borderLeft: '4px solid #C0392B' }}>
                <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{fmtDate(e.datum)} · {hm(e.zeit_von)}–{hm(e.zeit_bis)} · {e.client?.name || '–'}</div>
                <div style={{ fontSize: 13, color: '#C0392B', marginTop: 2 }}>Storniert von {e.cancelled_by}</div>
              </div>
            ))}
          </div>
        )}

        {unassigned.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--rose)', flexShrink: 0 }} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: 0 }}>Noch zu vergeben</h2>
              <span style={{ fontSize: 13, color: 'var(--mid)' }}>({unassigned.length})</span>
            </div>
            {unassigned.map(e => {
              const urgent = e.datum <= addDays(today, 3)
              return (
                <div key={e.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '12px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)', borderLeft: urgent ? '4px solid var(--rose)' : '4px solid var(--mid)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: urgent ? 'var(--rose)' : 'var(--dark)', fontSize: 15 }}>{fmtDate(e.datum)} · {hm(e.zeit_von)}–{hm(e.zeit_bis)} · {e.client?.name || '–'}</div>
                    {e.ort && <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>{e.ort}</div>}
                  </div>
                  {urgent && <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 'var(--r-pill)', background: 'var(--rose)', color: '#fff', flexShrink: 0 }}>dringend</span>}
                </div>
              )
            })}
          </div>
        )}

        <Section title="Aktuell" color="var(--rose)" items={laufend.map(e => ({ id: e.id, caregiver: e.caregiver?.name || '–', client: e.client?.name || '–', zeit_von: e.zeit_von, zeit_bis: e.zeit_bis, ort: e.ort }))} />
        <Section title="Noch offen" color="var(--mid)" items={offen.map(e => ({ id: e.id, caregiver: e.caregiver?.name || '–', client: e.client?.name || '–', zeit_von: e.zeit_von, zeit_bis: e.zeit_bis, ort: e.ort }))} />
        <Section title="Abgeschlossen" color="var(--sage)" items={[
          ...abgeschlossen.map(e => ({ id: e.id, caregiver: e.caregiver?.name || '–', client: e.client?.name || '–', zeit_von: e.zeit_von, zeit_bis: e.zeit_bis, ort: e.ort })),
          ...extraAbgeschlossen.map(a => ({ id: a.id, caregiver: a.caregiver?.name || '–', client: a.client?.name || '–', zeit_von: a.zeit_von, zeit_bis: a.zeit_bis })),
        ]} />
      </div>
    </div>
  )
}
