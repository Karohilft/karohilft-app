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

type Rule = {
  id: string
  caregiver_id: string
  client_id: string
  weekdays: number[]
  zeit_von: string
  zeit_bis: string
  ort: string | null
  start_date: string
}

type Person = { id: string; name: string; absent?: boolean }

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function overlaps(aVon: string, aBis: string, bVon: string, bBis: string) {
  return aVon < bBis && bVon < aBis
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function weekdayOf(dateStr: string) {
  return (new Date(dateStr + 'T00:00:00').getDay() + 6) % 7
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function weekdaysLabel(weekdays: number[]) {
  return [...weekdays].sort().map(d => WEEKDAYS[d]).join(', ')
}

export default function AdminEinsatzplan() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [caregivers, setCaregivers] = useState<Person[]>([])
  const [clients, setClients] = useState<Person[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [selected, setSelected] = useState<Person | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ client_id: '', datum: todayStr(), zeit_von: '', zeit_bis: '', ort: '' })
  const [recurring, setRecurring] = useState(false)
  const [recurDays, setRecurDays] = useState<number[]>([])
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  async function load() {
    const [{ data: cgs }, { data: cls }, { data: sched }, { data: rls }] = await Promise.all([
      getSupabase().from('caregivers').select('id,name,absent').order('name'),
      getSupabase().from('clients').select('id,name').order('name'),
      getSupabase().from('schedule').select('id,caregiver_id,client_id,datum,zeit_von,zeit_bis,ort,series_id').gte('datum', todayStr()).order('datum').order('zeit_von'),
      getSupabase().from('schedule_rules').select('id,caregiver_id,client_id,weekdays,zeit_von,zeit_bis,ort,start_date').order('zeit_von'),
    ])
    setCaregivers((cgs as any) || [])
    setClients((cls as any) || [])
    setEntries((sched as any) || [])
    setRules((rls as any) || [])
    setLoading(false)
  }

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      load()
    })
  }, [router])

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || '–'
  const caregiverName = (id: string) => caregivers.find(c => c.id === id)?.name || '–'

  const myEntries = useMemo(() => {
    if (!selected) return []
    return entries.filter(e => e.caregiver_id === selected.id)
  }, [entries, selected])

  const myRules = useMemo(() => {
    if (!selected) return []
    return rules.filter(r => r.caregiver_id === selected.id)
  }, [rules, selected])

  const myEntriesByDate = useMemo(() => {
    const groups: { datum: string; entries: Entry[] }[] = []
    for (const e of myEntries) {
      const last = groups[groups.length - 1]
      if (last && last.datum === e.datum) last.entries.push(e)
      else groups.push({ datum: e.datum, entries: [e] })
    }
    return groups
  }, [myEntries])

  function toggleDate(datum: string) {
    setExpandedDates(s => {
      const n = new Set(s)
      if (n.has(datum)) n.delete(datum); else n.add(datum)
      return n
    })
  }

  function openNew() {
    setEditingId(null)
    setEditingSeriesId(null)
    setEditingRuleId(null)
    setRecurring(false)
    setRecurDays([])
    setForm({ client_id: '', datum: todayStr(), zeit_von: '', zeit_bis: '', ort: '' })
    setShowForm(true)
  }

  function openEdit(e: Entry) {
    setEditingId(e.id)
    setEditingSeriesId(e.series_id)
    setEditingRuleId(null)
    setRecurring(false)
    setRecurDays([])
    setForm({ client_id: e.client_id, datum: e.datum, zeit_von: e.zeit_von, zeit_bis: e.zeit_bis, ort: e.ort || '' })
    setShowForm(true)
  }

  function openEditRule(r: Rule) {
    setEditingId(null)
    setEditingSeriesId(null)
    setEditingRuleId(r.id)
    setRecurring(true)
    setRecurDays(r.weekdays)
    setForm({ client_id: r.client_id, datum: r.start_date, zeit_von: r.zeit_von, zeit_bis: r.zeit_bis, ort: r.ort || '' })
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

    const ruleHit = rules.find(r =>
      r.caregiver_id === caregiverId &&
      datum >= r.start_date &&
      r.weekdays.includes(weekdayOf(datum)) &&
      overlaps(von, bis, r.zeit_von, r.zeit_bis)
    )
    if (ruleHit) return `${caregiverName(caregiverId)} hat am ${datum} bereits einen festen Termin (${ruleHit.zeit_von}–${ruleHit.zeit_bis}) bei ${clientName(ruleHit.client_id)}.`

    const extraConflict = extra.find(x => x.datum === datum && overlaps(von, bis, x.von, x.bis))
    if (extraConflict) return `Doppelte Zuteilung am ${datum} (${von}–${bis}) innerhalb der Serie.`
    return null
  }

  function ruleConflict(caregiverId: string, weekdays: number[], von: string, bis: string, startDate: string, ignoreId: string | null) {
    const r = rules.find(r =>
      r.caregiver_id === caregiverId &&
      r.id !== ignoreId &&
      r.weekdays.some(d => weekdays.includes(d)) &&
      overlaps(von, bis, r.zeit_von, r.zeit_bis)
    )
    if (r) return `${caregiverName(caregiverId)} hat bereits einen festen Termin an überschneidenden Tagen (${r.zeit_von}–${r.zeit_bis}) bei ${clientName(r.client_id)}.`

    const e = entries.find(e =>
      e.caregiver_id === caregiverId &&
      e.datum >= startDate &&
      weekdays.includes(weekdayOf(e.datum)) &&
      overlaps(von, bis, e.zeit_von, e.zeit_bis)
    )
    if (e) return `${caregiverName(caregiverId)} hat am ${fmtDate(e.datum)} bereits einen Einzeltermin (${e.zeit_von}–${e.zeit_bis}) bei ${clientName(e.client_id)}.`
    return null
  }

  async function save() {
    if (!selected) return
    if (!form.client_id || !form.zeit_von || !form.zeit_bis) return
    if (form.zeit_von >= form.zeit_bis) { alert('Die Endzeit muss nach der Startzeit liegen.'); return }

    if (recurring) {
      if (recurDays.length === 0) { alert('Bitte mindestens einen Wochentag wählen.'); return }
      const startDate = form.datum || todayStr()
      const conflict = ruleConflict(selected.id, recurDays, form.zeit_von, form.zeit_bis, startDate, editingRuleId)
      if (conflict) { alert('Überschneidung: ' + conflict); return }

      setSaving(true)
      const payload = { caregiver_id: selected.id, client_id: form.client_id, weekdays: recurDays, zeit_von: form.zeit_von, zeit_bis: form.zeit_bis, ort: form.ort || null, start_date: startDate }
      const { error } = editingRuleId
        ? await getSupabase().from('schedule_rules').update(payload).eq('id', editingRuleId)
        : await getSupabase().from('schedule_rules').insert(payload)
      if (error) { alert('Speichern fehlgeschlagen: ' + error.message); setSaving(false); return }
      setShowForm(false)
      setSaving(false)
      await load()
      return
    }

    if (!form.datum) return
    const conflict = checkConflict(selected.id, form.datum, form.zeit_von, form.zeit_bis, editingId)
    if (conflict) { alert('Überschneidung: ' + conflict); return }

    setSaving(true)
    const payload = { caregiver_id: selected.id, client_id: form.client_id, datum: form.datum, zeit_von: form.zeit_von, zeit_bis: form.zeit_bis, ort: form.ort || null }
    const { error } = editingId
      ? await getSupabase().from('schedule').update(payload).eq('id', editingId)
      : await getSupabase().from('schedule').insert(payload)
    if (error) { alert('Speichern fehlgeschlagen: ' + error.message); setSaving(false); return }
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

  async function delRule(id: string) {
    if (!confirm('Festen Termin beenden?')) return
    await getSupabase().from('schedule_rules').delete().eq('id', id)
    setShowForm(false)
    await load()
  }

  function toggleRecurDay(idx: number) {
    setRecurDays(d => d.includes(idx) ? d.filter(x => x !== idx) : [...d, idx].sort())
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  // Caregiver list
  if (!selected) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, minWidth: 0, overflow: 'hidden' }}>
            <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 }}>←</button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Einsatzplanung</h1>
          </div>

          {caregivers.length === 0
            ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 40, textAlign: 'center', color: 'var(--mid)' }}>Noch keine Betreuer angelegt.</div>
            : caregivers.map(c => {
              const count = entries.filter(e => e.caregiver_id === c.id).length + rules.filter(r => r.caregiver_id === c.id).length
              return (
                <div key={c.id} onClick={() => setSelected(c)} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 10, boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <span style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 16 }}>{c.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {c.absent && <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 'var(--r-pill)', background: 'var(--rose)', color: '#fff' }}>abwesend</span>}
                    <span style={{ fontSize: 13, color: 'var(--mid)' }}>{count} Termin{count === 1 ? '' : 'e'}</span>
                    <span style={{ color: 'var(--rose)', fontSize: 18 }}>›</span>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    )
  }

  // Caregiver detail
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
            <button onClick={() => { setSelected(null); setShowForm(false) }} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 }}>←</button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.name}</h1>
          </div>
          <button onClick={openNew} style={{ padding: '8px 16px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px var(--rose-glow)', flexShrink: 0, whiteSpace: 'nowrap', marginLeft: 10 }}>+ Neu</button>
        </div>

        {showForm && (
          <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '24px 20px', marginBottom: 20, boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, color: 'var(--dark)', margin: '0 0 16px' }}>{editingId ? 'Termin bearbeiten' : editingRuleId ? 'Festen Termin bearbeiten' : 'Neuer Termin'}</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                <option value="">– Klient –</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              {!recurring && (
                <label style={{ fontSize: 13, color: 'var(--mid)' }}>Datum
                  <input type="date" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} style={{ display: 'block', marginTop: 4, padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, width: '100%', boxSizing: 'border-box' }} />
                </label>
              )}

              <label style={{ fontSize: 13, color: 'var(--mid)' }}>Von
                <TimeSelect value={form.zeit_von} onChange={v => setForm(f => ({ ...f, zeit_von: v }))} style={{ marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 13, color: 'var(--mid)' }}>Bis
                <TimeSelect value={form.zeit_bis} onChange={v => setForm(f => ({ ...f, zeit_bis: v }))} style={{ marginTop: 4 }} />
              </label>
              <input placeholder="Ort (optional)" value={form.ort} onChange={e => setForm(f => ({ ...f, ort: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />

              {!editingId && (
                <div style={{ borderTop: '1px solid rgba(28,24,20,.08)', paddingTop: 12 }}>
                  {!editingRuleId && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--dark)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
                      Fester Termin (z.B. Mo–Do, läuft bis er beendet wird)
                    </label>
                  )}
                  {recurring && (
                    <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {WEEKDAYS.map((wd, i) => (
                          <button key={wd} type="button" onClick={() => toggleRecurDay(i)} style={{ padding: '6px 12px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: recurDays.includes(i) ? 'var(--rose)' : '#fff', color: recurDays.includes(i) ? '#fff' : 'var(--dark)', fontSize: 13, cursor: 'pointer' }}>{wd}</button>
                        ))}
                      </div>
                      <label style={{ fontSize: 13, color: 'var(--mid)' }}>Beginnt am
                        <input type="date" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} style={{ display: 'block', marginTop: 4, padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, width: '100%', boxSizing: 'border-box' }} />
                      </label>
                      <p style={{ fontSize: 13, color: 'var(--mid)', margin: 0 }}>Läuft automatisch weiter, bis der Termin beendet wird.</p>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                <div>
                  {editingSeriesId && <button onClick={() => delSeries(editingSeriesId)} style={{ padding: '10px 16px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(196,90,90,.3)', background: '#fff', color: '#c45a5a', cursor: 'pointer', fontSize: 13 }}>Ganze Serie löschen</button>}
                  {editingRuleId && <button onClick={() => delRule(editingRuleId)} style={{ padding: '10px 16px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(196,90,90,.3)', background: '#fff', color: '#c45a5a', cursor: 'pointer', fontSize: 13 }}>Festen Termin beenden</button>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Abbrechen</button>
                  <button onClick={save} disabled={saving || !form.client_id || !form.zeit_von || !form.zeit_bis || (recurring ? recurDays.length === 0 : !form.datum)} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Speichern…' : 'Speichern'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {myRules.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 17, color: 'var(--dark)', margin: '0 0 8px' }}>Feste Termine</h2>
            {myRules.map(r => (
              <div key={r.id} onClick={() => openEditRule(r)} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{weekdaysLabel(r.weekdays)} · {r.zeit_von}–{r.zeit_bis}</div>
                  <div style={{ fontSize: 14, color: 'var(--mid)', marginTop: 2 }}>{clientName(r.client_id)}{r.ort ? ` · ${r.ort}` : ''}</div>
                </div>
                <button onClick={ev => { ev.stopPropagation(); delRule(r.id) }} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
        )}

        {myRules.length > 0 && <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 17, color: 'var(--dark)', margin: '0 0 8px' }}>Einzeltermine</h2>}
        {myEntriesByDate.length === 0
          ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 40, textAlign: 'center', color: 'var(--mid)' }}>Keine kommenden Einzeltermine.<br /><span style={{ fontSize: 14 }}>Klicke auf "+ Neu" um einen Einsatz zuzuteilen.</span></div>
          : myEntriesByDate.map(({ datum, entries: dayEntries }) => {
            if (dayEntries.length === 1) {
              const e = dayEntries[0]
              return (
                <div key={datum} onClick={() => openEdit(e)} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{fmtDate(e.datum)} · {e.zeit_von}–{e.zeit_bis}</div>
                    <div style={{ fontSize: 14, color: 'var(--mid)', marginTop: 2 }}>{clientName(e.client_id)}{e.ort ? ` · ${e.ort}` : ''}</div>
                  </div>
                  <button onClick={ev => { ev.stopPropagation(); del(e.id) }} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
              )
            }
            const expanded = expandedDates.has(datum)
            return (
              <div key={datum} style={{ background: '#fff', borderRadius: 'var(--r-md)', marginBottom: 8, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                <div onClick={() => toggleDate(datum)} style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{fmtDate(datum)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--mid)' }}>{dayEntries.length} Termine</span>
                    <span style={{ color: 'var(--rose)', fontSize: 14 }}>{expanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expanded && (
                  <div style={{ borderTop: '1px solid rgba(28,24,20,.08)' }}>
                    {dayEntries.map(e => (
                      <div key={e.id} onClick={() => openEdit(e)} style={{ padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid rgba(28,24,20,.05)' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 14 }}>{e.zeit_von}–{e.zeit_bis}</div>
                          <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>{clientName(e.client_id)}{e.ort ? ` · ${e.ort}` : ''}</div>
                        </div>
                        <button onClick={ev => { ev.stopPropagation(); del(e.id) }} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}
