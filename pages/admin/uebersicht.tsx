import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

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

function todayStr() {
  return new Date().toISOString().slice(0, 10)
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

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const today = todayStr()
      const [{ data: sched }, { data: acts }] = await Promise.all([
        getSupabase().from('schedule').select('id,caregiver_id,client_id,zeit_von,zeit_bis,ort,caregiver:caregivers(name),client:clients(name)').eq('datum', today).order('zeit_von'),
        getSupabase().from('activities').select('id,caregiver_id,client_id,zeit_von,zeit_bis,caregiver:caregivers(name),client:clients(name)').eq('datum', today).order('zeit_von'),
      ])
      setSchedule((sched as any) || [])
      setActivities((acts as any) || [])
      setLoading(false)
    })
  }, [router])

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  const now = nowTime()

  function isDone(e: ScheduleEntry) {
    return activities.some(a => a.caregiver_id === e.caregiver_id && a.client_id === e.client_id && a.zeit_von === e.zeit_von)
  }

  const laufend = schedule.filter(e => !isDone(e) && e.zeit_von <= now && now < e.zeit_bis)
  const offen = schedule.filter(e => !isDone(e) && now < e.zeit_von)
  const abgeschlossen = schedule.filter(e => isDone(e))
  const extraAbgeschlossen = activities.filter(a => !schedule.some(e => e.caregiver_id === a.caregiver_id && e.client_id === a.client_id && e.zeit_von === a.zeit_von))

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
              <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{e.zeit_von}–{e.zeit_bis} · {e.caregiver} → {e.client}</div>
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
