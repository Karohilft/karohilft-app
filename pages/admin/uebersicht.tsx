import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'
import { hm } from '../../lib/time'
import TimeSelect from '../../components/TimeSelect'

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

type Person = { id: string; name: string }

function todayStr() {
  return new Date().toISOString().slice(0, 10)
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
  const [caregivers, setCaregivers] = useState<Person[]>([])
  const [clients, setClients] = useState<Person[]>([])
  const [editEntry, setEditEntry] = useState<ScheduleEntry | null>(null)
  const [editForm, setEditForm] = useState({ caregiver_id: '', client_id: '', zeit_von: '', zeit_bis: '', ort: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const today = todayStr()
    const [{ data: sched }, { data: acts }, { data: rls }, { data: cgs }, { data: cls }] = await Promise.all([
      getSupabase().from('schedule').select('id,caregiver_id,client_id,zeit_von,zeit_bis,ort,caregiver:caregivers(name),client:clients(name)').eq('datum', today).order('zeit_von'),
      getSupabase().from('activities').select('id,caregiver_id,client_id,zeit_von,zeit_bis,caregiver:caregivers(name),client:clients(name)').eq('datum', today).order('zeit_von'),
      getSupabase().from('schedule_rules').select('id,caregiver_id,client_id,weekdays,zeit_von,zeit_bis,ort,start_date,caregiver:caregivers(name),client:clients(name)'),
      getSupabase().from('caregivers').select('id,name').neq('role', 'admin').order('name'),
      getSupabase().from('clients').select('id,name').order('name'),
    ])
    setSchedule((sched as any) || [])
    setActivities((acts as any) || [])
    setRules((rls as any) || [])
    setCaregivers((cgs as any) || [])
    setClients((cls as any) || [])
    setLoading(false)
  }

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      load()
    })
  }, [router])

  async function saveEdit() {
    if (!editEntry) return
    setSaving(true)
    await getSupabase().from('schedule').update({
      caregiver_id: editForm.caregiver_id || null,
      client_id: editForm.client_id,
      zeit_von: editForm.zeit_von,
      zeit_bis: editForm.zeit_bis,
      ort: editForm.ort || null,
    }).eq('id', editEntry.id)
    setSaving(false)
    setEditEntry(null)
    await load()
  }

  async function delEntry() {
    if (!editEntry) return
    if (!confirm('Einsatz löschen?')) return
    await getSupabase().from('schedule').delete().eq('id', editEntry.id)
    setEditEntry(null)
    await load()
  }

  function openEdit(e: ScheduleEntry) {
    if (e.id.startsWith('rule-')) return
    setEditEntry(e)
    setEditForm({ caregiver_id: e.caregiver_id || '', client_id: e.client_id || '', zeit_von: e.zeit_von, zeit_bis: e.zeit_bis, ort: e.ort || '' })
  }

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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, minWidth: 0, overflow: 'hidden' }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 }}>←</button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Übersicht heute</h1>
        </div>

        {/* Edit modal */}
        {editEntry && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '24px 20px', width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-md)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, color: 'var(--dark)', margin: '0 0 16px' }}>Einsatz bearbeiten</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                <select value={editForm.caregiver_id} onChange={e => setEditForm(f => ({ ...f, caregiver_id: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                  <option value="">– kein Betreuer –</option>
                  {caregivers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={editForm.client_id} onChange={e => setEditForm(f => ({ ...f, client_id: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                  <option value="">– Klient –</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ fontSize: 13, color: 'var(--mid)' }}>Von
                    <TimeSelect value={editForm.zeit_von} onChange={v => setEditForm(f => ({ ...f, zeit_von: v }))} style={{ marginTop: 4 }} />
                  </label>
                  <label style={{ fontSize: 13, color: 'var(--mid)' }}>Bis
                    <TimeSelect value={editForm.zeit_bis} onChange={v => setEditForm(f => ({ ...f, zeit_bis: v }))} style={{ marginTop: 4 }} />
                  </label>
                </div>
                <input placeholder="Ort (optional)" value={editForm.ort} onChange={e => setEditForm(f => ({ ...f, ort: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
                <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 4 }}>
                  <button onClick={delEntry} style={{ padding: '10px 16px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(196,90,90,.3)', background: '#fff', color: '#c45a5a', cursor: 'pointer', fontSize: 13 }}>Löschen</button>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setEditEntry(null)} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Abbrechen</button>
                    <button onClick={saveEdit} disabled={saving} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Speichern…' : 'Speichern'}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {(() => {
          const timeline = [
            ...laufend.map(e => ({ entry: e, color: 'var(--rose)' })),
            ...offen.map(e => ({ entry: e, color: 'var(--mid)' })),
            ...abgeschlossen.map(e => ({ entry: e, color: 'var(--sage)' })),
            ...extraAbgeschlossen.map(a => ({ entry: { id: a.id, caregiver_id: a.caregiver_id || '', client_id: a.client_id || '', zeit_von: a.zeit_von, zeit_bis: a.zeit_bis, ort: null as string | null, caregiver: a.caregiver, client: a.client } as ScheduleEntry, color: 'var(--sage)' })),
          ].sort((a, b) => a.entry.zeit_von.localeCompare(b.entry.zeit_von))
          return (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: 0 }}>Heute</h2>
                <span style={{ fontSize: 13, color: 'var(--mid)' }}>({timeline.length})</span>
              </div>
              {timeline.length === 0
                ? <div style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', color: 'var(--mid)', fontSize: 14, boxShadow: 'var(--shadow-sm)' }}>–</div>
                : timeline.map(({ entry: e, color }) => {
                  const isRule = e.id.startsWith('rule-')
                  const isActivity = extraAbgeschlossen.some(a => a.id === e.id)
                  const editable = !isRule && !isActivity
                  return (
                    <div key={e.id} onClick={() => editable ? openEdit(e) : undefined} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '12px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)', borderLeft: `4px solid ${color}`, opacity: color === 'var(--sage)' ? 0.6 : 1, cursor: editable ? 'pointer' : 'default' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{hm(e.zeit_von)}–{hm(e.zeit_bis)} · {e.caregiver?.name || '–'} → {e.client?.name || '–'}</div>
                        </div>
                        {editable && <span style={{ fontSize: 12, color: 'var(--mid)', flexShrink: 0 }}>✎</span>}
                      </div>
                      {e.ort && <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2, marginLeft: 17 }}>{e.ort}</div>}
                    </div>
                  )
                })}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
