import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'
import TimeSelect from '../../components/TimeSelect'

type Entry = {
  id: string
  caregiver_id: string
  client_id: string
  datum: string
  zeit_von: string
  zeit_bis: string
  ort: string | null
  series_id: string | null
}

type Person = { id: string; name: string; absent?: boolean }

const COLORS = ['#C47C5A', '#7C9A82', '#8C7CA8', '#5A8CA8', '#C4A05A', '#A85A7C', '#5AA890', '#A87C5A']

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function colorFor(id: string, ids: string[]) {
  const idx = ids.indexOf(id)
  return COLORS[idx % COLORS.length]
}

function overlaps(aVon: string, aBis: string, bVon: string, bBis: string) {
  return aVon < bBis && bVon < aBis
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function startOfWeek(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = (d.getDay() + 6) % 7 // 0 = Monday
  d.setDate(d.getDate() - day)
  return d
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function fmtISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

function fmtLabel(d: Date) {
  return d.toLocaleDateString('de-AT', { weekday: 'long', day: '2-digit', month: '2-digit' })
}

export default function AdminEinsatzplan() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [caregivers, setCaregivers] = useState<Person[]>([])
  const [clients, setClients] = useState<Person[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayStr()))
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ caregiver_id: '', client_id: '', datum: todayStr(), zeit_von: '', zeit_bis: '', ort: '' })
  const [recurring, setRecurring] = useState(false)
  const [recurUntil, setRecurUntil] = useState('')
  const [recurDays, setRecurDays] = useState<number[]>([])

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const weekFrom = fmtISO(weekDates[0])
  const weekTo = fmtISO(weekDates[6])

  async function load() {
    const [{ data: cgs }, { data: cls }, { data: sched }] = await Promise.all([
      getSupabase().from('caregivers').select('id,name,absent').order('name'),
      getSupabase().from('clients').select('id,name').order('name'),
      getSupabase().from('schedule').select('id,caregiver_id,client_id,datum,zeit_von,zeit_bis,ort,series_id').gte('datum', weekFrom).lte('datum', weekTo).order('zeit_von'),
    ])
    setCaregivers((cgs as any) || [])
    setClients((cls as any) || [])
    setEntries((sched as any) || [])
    setLoading(false)
  }

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      load()
    })
  }, [router])

  useEffect(() => {
    if (!loading) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekFrom, weekTo])

  const caregiverIds = useMemo(() => caregivers.map(c => c.id), [caregivers])
  const clientName = (id: string) => clients.find(c => c.id === id)?.name || '–'
  const caregiverName = (id: string) => caregivers.find(c => c.id === id)?.name || '–'

  function entriesForDay(dateStr: string) {
    return entries.filter(e => e.datum === dateStr).sort((a, b) => a.zeit_von.localeCompare(b.zeit_von))
  }

  function openNew(dateStr?: string) {
    setEditingId(null)
    setEditingSeriesId(null)
    setRecurring(false)
    setRecurUntil('')
    setRecurDays([])
    setForm({ caregiver_id: '', client_id: '', datum: dateStr || todayStr(), zeit_von: '', zeit_bis: '', ort: '' })
    setShowForm(true)
  }

  function openEdit(e: Entry) {
    setEditingId(e.id)
    setEditingSeriesId(e.series_id)
    setRecurring(false)
    setRecurUntil('')
    setRecurDays([])
    setForm({ caregiver_id: e.caregiver_id, client_id: e.client_id, datum: e.datum, zeit_von: e.zeit_von, zeit_bis: e.zeit_bis, ort: e.ort || '' })
    setShowForm(true)
  }

  function checkConflict(caregiverId: string, datum: string, von: string, bis: string, ignoreId: string | null, extra: { datum: string; von: string; bis: string }[] = []) {
    const existing = entries.find(e =>
      e.caregiver_id === caregiverId &&
      e.id !== ignoreId &&
      e.datum === datum &&
      overlaps(von, bis, e.zeit_von, e.zeit_bis)
    )
    if (existing) return `${caregiverName(caregiverId)} ist am ${existing.datum} von ${existing.zeit_von}–${existing.zeit_bis} bereits bei ${clientName(existing.client_id)} eingeteilt.`
    const extraConflict = extra.find(x => x.datum === datum && overlaps(von, bis, x.von, x.bis))
    if (extraConflict) return `Doppelte Zuteilung am ${datum} (${von}–${bis}) innerhalb der Serie.`
    return null
  }

  async function save() {
    if (!form.caregiver_id || !form.client_id || !form.datum || !form.zeit_von || !form.zeit_bis) return
    if (form.zeit_von >= form.zeit_bis) { alert('Die Endzeit muss nach der Startzeit liegen.'); return }

    if (recurring) {
      if (!recurUntil || recurDays.length === 0) { alert('Bitte Wochentage und Enddatum für die Wiederholung wählen.'); return }
      if (recurUntil < form.datum) { alert('Das Enddatum muss nach dem Startdatum liegen.'); return }
      const dates: string[] = []
      let d = new Date(form.datum + 'T00:00:00')
      const end = new Date(recurUntil + 'T00:00:00')
      while (d <= end) {
        const wd = (d.getDay() + 6) % 7
        if (recurDays.includes(wd)) dates.push(fmtISO(d))
        d = addDays(d, 1)
      }
      if (dates.length === 0) { alert('Im gewählten Zeitraum liegt kein passender Wochentag.'); return }

      const seen: { datum: string; von: string; bis: string }[] = []
      for (const datum of dates) {
        const conflict = checkConflict(form.caregiver_id, datum, form.zeit_von, form.zeit_bis, null, seen)
        if (conflict) { alert('Überschneidung: ' + conflict); return }
        seen.push({ datum, von: form.zeit_von, bis: form.zeit_bis })
      }

      setSaving(true)
      const seriesId = crypto.randomUUID()
      const rows = dates.map(datum => ({ caregiver_id: form.caregiver_id, client_id: form.client_id, datum, zeit_von: form.zeit_von, zeit_bis: form.zeit_bis, ort: form.ort || null, series_id: seriesId }))
      await getSupabase().from('schedule').insert(rows)
      setShowForm(false)
      setSaving(false)
      await load()
      return
    }

    const conflict = checkConflict(form.caregiver_id, form.datum, form.zeit_von, form.zeit_bis, editingId)
    if (conflict) { alert('Überschneidung: ' + conflict); return }

    setSaving(true)
    const payload = { caregiver_id: form.caregiver_id, client_id: form.client_id, datum: form.datum, zeit_von: form.zeit_von, zeit_bis: form.zeit_bis, ort: form.ort || null }
    if (editingId) {
      await getSupabase().from('schedule').update(payload).eq('id', editingId)
    } else {
      await getSupabase().from('schedule').insert(payload)
    }
    setShowForm(false)
    setSaving(false)
    await load()
  }

  async function del(id: string) {
    if (!confirm('Termin löschen?')) return
    await getSupabase().from('schedule').delete().eq('id', id)
    await load()
  }

  async function delSeries(seriesId: string) {
    if (!confirm('Die ganze Serie löschen?')) return
    await getSupabase().from('schedule').delete().eq('series_id', seriesId)
    setShowForm(false)
    await load()
  }

  function toggleRecurDay(idx: number) {
    setRecurDays(d => d.includes(idx) ? d.filter(x => x !== idx) : [...d, idx].sort())
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
            <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 }}>←</button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Einsatzplanung</h1>
          </div>
          <button onClick={() => openNew()} style={{ padding: '8px 16px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px var(--rose-glow)', flexShrink: 0, whiteSpace: 'nowrap', marginLeft: 10 }}>+ Neu</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => setWeekStart(s => addDays(s, -7))} style={{ padding: '8px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', cursor: 'pointer' }}>← Woche</button>
          <span style={{ fontSize: 14, color: 'var(--mid)', fontWeight: 500 }}>{fmtISO(weekDates[0])} – {fmtISO(weekDates[6])}</span>
          <button onClick={() => setWeekStart(s => addDays(s, 7))} style={{ padding: '8px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', cursor: 'pointer' }}>Woche →</button>
        </div>

        {showForm && (
          <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '24px 20px', marginBottom: 20, boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, color: 'var(--dark)', margin: '0 0 16px' }}>{editingId ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <select value={form.caregiver_id} onChange={e => setForm(f => ({ ...f, caregiver_id: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                <option value="">– Betreuer –</option>
                {caregivers.map(c => <option key={c.id} value={c.id} disabled={c.absent}>{c.name}{c.absent ? ' (abwesend)' : ''}</option>)}
              </select>
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                <option value="">– Klient –</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <label style={{ fontSize: 13, color: 'var(--mid)' }}>Datum
                <input type="date" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} style={{ display: 'block', marginTop: 4, padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, width: '100%', boxSizing: 'border-box' }} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <TimeSelect value={form.zeit_von} onChange={v => setForm(f => ({ ...f, zeit_von: v }))} />
                <TimeSelect value={form.zeit_bis} onChange={v => setForm(f => ({ ...f, zeit_bis: v }))} />
              </div>
              <input placeholder="Ort (optional)" value={form.ort} onChange={e => setForm(f => ({ ...f, ort: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />

              {!editingId && (
                <div style={{ borderTop: '1px solid rgba(28,24,20,.08)', paddingTop: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--dark)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
                    Wiederholen (z.B. Mo–Do, fester Termin)
                  </label>
                  {recurring && (
                    <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {WEEKDAYS.map((wd, i) => (
                          <button key={wd} type="button" onClick={() => toggleRecurDay(i)} style={{ padding: '6px 12px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: recurDays.includes(i) ? 'var(--rose)' : '#fff', color: recurDays.includes(i) ? '#fff' : 'var(--dark)', fontSize: 13, cursor: 'pointer' }}>{wd}</button>
                        ))}
                      </div>
                      <label style={{ fontSize: 13, color: 'var(--mid)' }}>Wiederholen bis
                        <input type="date" value={recurUntil} onChange={e => setRecurUntil(e.target.value)} style={{ display: 'block', marginTop: 4, padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, width: '100%', boxSizing: 'border-box' }} />
                      </label>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                <div>
                  {editingSeriesId && <button onClick={() => delSeries(editingSeriesId)} style={{ padding: '10px 16px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(196,90,90,.3)', background: '#fff', color: '#c45a5a', cursor: 'pointer', fontSize: 13 }}>Ganze Serie löschen</button>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Abbrechen</button>
                  <button onClick={save} disabled={saving || !form.caregiver_id || !form.client_id || !form.datum || !form.zeit_von || !form.zeit_bis} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Speichern…' : 'Speichern'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {caregivers.length === 0
          ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 40, textAlign: 'center', color: 'var(--mid)' }}>Noch keine Betreuer angelegt.</div>
          : weekDates.map(d => {
            const dateStr = fmtISO(d)
            const dayEntries = entriesForDay(dateStr)
            const busyIds = [...new Set(dayEntries.map(e => e.caregiver_id))]
            const freeNames = caregivers.filter(c => !c.absent && !busyIds.includes(c.id)).map(c => c.name)
            const absentNames = caregivers.filter(c => c.absent).map(c => c.name)
            return (
              <div key={dateStr} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 10, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: dayEntries.length ? 10 : 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15, textTransform: 'capitalize' }}>{fmtLabel(d)}</span>
                  <button onClick={() => openNew(dateStr)} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', cursor: 'pointer', fontSize: 13, padding: 0 }}>+ Termin</button>
                </div>
                {dayEntries.map(e => (
                  <div key={e.id} onClick={() => openEdit(e)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 'var(--r-sm)', background: colorFor(e.caregiver_id, caregiverIds) + '22', borderLeft: `4px solid ${colorFor(e.caregiver_id, caregiverIds)}`, marginBottom: 6, cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 14 }}>{e.zeit_von}–{e.zeit_bis} · {caregiverName(e.caregiver_id)} → {clientName(e.client_id)}</div>
                      {e.ort && <div style={{ fontSize: 13, color: 'var(--mid)' }}>{e.ort}</div>}
                    </div>
                    <button onClick={ev => { ev.stopPropagation(); del(e.id) }} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>×</button>
                  </div>
                ))}
                {freeNames.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: dayEntries.length ? 6 : 0 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 'var(--r-pill)', background: 'var(--sage)', color: '#fff', marginRight: 6 }}>frei</span>
                    {freeNames.join(', ')}
                  </div>
                )}
                {absentNames.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 4 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 'var(--r-pill)', background: 'var(--rose)', color: '#fff', marginRight: 6 }}>abwesend</span>
                    {absentNames.join(', ')}
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
