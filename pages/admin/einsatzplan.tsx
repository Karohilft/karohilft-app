import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'
import TimeSelect from '../../components/TimeSelect'
import { hm } from '../../lib/time'

type Entry = {
  id: string
  caregiver_id: string
  client_id: string
  datum: string
  zeit_von: string
  zeit_bis: string
  ort: string | null
  series_id: string | null
  cancelled_by: string | null
  cancelled_at: string | null
}

type Rule = {
  id: string
  caregiver_id: string | null
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

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
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
  const [savedMsg, setSavedMsg] = useState('')
  const [form, setForm] = useState({ client_id: '', datum: todayStr(), datum_bis: '', zeit_von: '', zeit_bis: '', ort: '' })
  const [recurring, setRecurring] = useState(false)
  const [recurDays, setRecurDays] = useState<number[]>([])
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [showOpenForm, setShowOpenForm] = useState(false)
  const [editingOpenId, setEditingOpenId] = useState<string | null>(null)
  const [openForm, setOpenForm] = useState({ client_id: '', caregiver_id: '', datum: todayStr(), datum_bis: '', zeit_von: '', zeit_bis: '', ort: '' })
  const [savingOpen, setSavingOpen] = useState(false)
  const [openRecurring, setOpenRecurring] = useState(false)
  const [openRecurDays, setOpenRecurDays] = useState<number[]>([])
  const [editingOpenRuleId, setEditingOpenRuleId] = useState<string | null>(null)
  const [caregiverSearch, setCaregiverSearch] = useState('')
  const [showFutureOpen, setShowFutureOpen] = useState(false)
  type ExtraSlot = { client_id: string; zeit_von: string; zeit_bis: string; ort: string }
  const [extraSlots, setExtraSlots] = useState<ExtraSlot[]>([])
  const [openExtraSlots, setOpenExtraSlots] = useState<ExtraSlot[]>([])

  async function load() {
    const [{ data: cgs }, { data: cls }, { data: sched }, { data: rls }] = await Promise.all([
      getSupabase().from('caregivers').select('id,name,absent').neq('role', 'admin').order('name'),
      getSupabase().from('clients').select('id,name').order('name'),
      getSupabase().from('schedule').select('id,caregiver_id,client_id,datum,zeit_von,zeit_bis,ort,series_id,cancelled_by,cancelled_at').gte('datum', todayStr()).order('datum').order('zeit_von'),
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
  const caregiverName = (id: string | null) => caregivers.find(c => c.id === id)?.name || '–'

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

  const openEntries = useMemo(() => entries.filter(e => !e.caregiver_id), [entries])
  const openRules = useMemo(() => rules.filter(r => !r.caregiver_id), [rules])

  function openOpenNew() {
    setEditingOpenId(null)
    setEditingOpenRuleId(null)
    setOpenRecurring(false)
    setOpenRecurDays([])
    setOpenForm({ client_id: '', caregiver_id: '', datum: todayStr(), datum_bis: '', zeit_von: '', zeit_bis: '', ort: '' })
    setOpenExtraSlots([])
    setShowOpenForm(true)
  }

  function openOpenEdit(e: Entry) {
    setEditingOpenId(e.id)
    setEditingOpenRuleId(null)
    setOpenRecurring(false)
    setOpenRecurDays([])
    setOpenForm({ client_id: e.client_id, caregiver_id: e.caregiver_id || '', datum: e.datum, datum_bis: '', zeit_von: e.zeit_von, zeit_bis: e.zeit_bis, ort: e.ort || '' })
    setOpenExtraSlots([])
    setShowOpenForm(true)
  }

  function openOpenEditRule(r: Rule) {
    setEditingOpenId(null)
    setEditingOpenRuleId(r.id)
    setOpenRecurring(true)
    setOpenRecurDays(r.weekdays)
    setOpenForm({ client_id: r.client_id, caregiver_id: r.caregiver_id || '', datum: r.start_date, datum_bis: '', zeit_von: r.zeit_von, zeit_bis: r.zeit_bis, ort: r.ort || '' })
    setShowOpenForm(true)
  }

  function toggleOpenRecurDay(idx: number) {
    setOpenRecurDays(d => d.includes(idx) ? d.filter(x => x !== idx) : [...d, idx].sort())
  }

  async function saveOpen() {
    if (!openForm.client_id || !openForm.zeit_von || !openForm.zeit_bis) return
    if (openForm.zeit_von >= openForm.zeit_bis) { alert('Die Endzeit muss nach der Startzeit liegen.'); return }

    if (openRecurring) {
      if (openRecurDays.length === 0) { alert('Bitte mindestens einen Wochentag wählen.'); return }
      const startDate = openForm.datum || todayStr()
      if (openForm.caregiver_id) {
        const conflict = ruleConflict(openForm.caregiver_id, openRecurDays, openForm.zeit_von, openForm.zeit_bis, startDate, editingOpenRuleId)
        if (conflict) { alert('Überschneidung: ' + conflict); return }
      }
      setSavingOpen(true)
      const payload = { caregiver_id: openForm.caregiver_id || null, client_id: openForm.client_id, weekdays: openRecurDays, zeit_von: openForm.zeit_von, zeit_bis: openForm.zeit_bis, ort: openForm.ort || null, start_date: startDate }
      const { error } = editingOpenRuleId
        ? await getSupabase().from('schedule_rules').update(payload).eq('id', editingOpenRuleId)
        : await getSupabase().from('schedule_rules').insert(payload)
      if (error) { alert('Speichern fehlgeschlagen: ' + error.message); setSavingOpen(false); return }
      setShowOpenForm(false)
      setSavingOpen(false)
      await load()
      return
    }

    if (!openForm.datum) return

    // Build list of dates (single day or range)
    const openDates: string[] = []
    if (!editingOpenId && openForm.datum_bis && openForm.datum_bis >= openForm.datum) {
      let d = openForm.datum
      while (d <= openForm.datum_bis) {
        openDates.push(d)
        d = addDays(d, 1)
      }
    } else {
      openDates.push(openForm.datum)
    }

    if (openForm.caregiver_id) {
      for (const datum of openDates) {
        const conflict = checkConflict(openForm.caregiver_id, datum, openForm.zeit_von, openForm.zeit_bis, editingOpenId)
        if (conflict) { alert('Überschneidung: ' + conflict); return }
      }
      for (const s of openExtraSlots) {
        if (!s.zeit_von || !s.zeit_bis) continue
        for (const datum of openDates) {
          const c2 = checkConflict(openForm.caregiver_id, datum, s.zeit_von, s.zeit_bis, null)
          if (c2) { alert('Überschneidung (Zeitblock): ' + c2); return }
        }
      }
    }

    setSavingOpen(true)
    try {
      if (editingOpenId) {
        const { error } = await getSupabase().from('schedule').update({ caregiver_id: openForm.caregiver_id || null, client_id: openForm.client_id, datum: openForm.datum, zeit_von: openForm.zeit_von, zeit_bis: openForm.zeit_bis, ort: openForm.ort || null }).eq('id', editingOpenId)
        if (error) throw new Error(error.message)
      } else {
        const rows = openDates.map(datum => ({ caregiver_id: openForm.caregiver_id || null, client_id: openForm.client_id, datum, zeit_von: openForm.zeit_von, zeit_bis: openForm.zeit_bis, ort: openForm.ort || null }))
        const { error } = await getSupabase().from('schedule').insert(rows)
        if (error) throw new Error(error.message)
      }

      if (!editingOpenId && openExtraSlots.length > 0) {
        const extras = openExtraSlots.filter(s => s.client_id && s.zeit_von && s.zeit_bis && s.zeit_von < s.zeit_bis)
        if (extras.length > 0) {
          const extraRows = openDates.flatMap(datum => extras.map(s => ({ caregiver_id: openForm.caregiver_id || null, client_id: s.client_id || openForm.client_id, datum, zeit_von: s.zeit_von, zeit_bis: s.zeit_bis, ort: s.ort || null })))
          const { error: e2 } = await getSupabase().from('schedule').insert(extraRows)
          if (e2) throw new Error(e2.message)
        }
      }

      setShowOpenForm(false)
      setSavingOpen(false)
      await load()
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + (err?.message || String(err)))
      setSavingOpen(false)
    }
  }

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
    setForm({ client_id: '', datum: todayStr(), datum_bis: '', zeit_von: '', zeit_bis: '', ort: '' })
    setExtraSlots([])
    setShowForm(true)
  }

  function openEdit(e: Entry) {
    setEditingId(e.id)
    setEditingSeriesId(e.series_id)
    setEditingRuleId(null)
    setRecurring(false)
    setRecurDays([])
    setForm({ client_id: e.client_id, datum: e.datum, datum_bis: '', zeit_von: e.zeit_von, zeit_bis: e.zeit_bis, ort: e.ort || '' })
    setExtraSlots([])
    setShowForm(true)
  }

  function openEditRule(r: Rule) {
    setEditingId(null)
    setEditingSeriesId(null)
    setEditingRuleId(r.id)
    setRecurring(true)
    setRecurDays(r.weekdays)
    setForm({ client_id: r.client_id, datum: r.start_date, datum_bis: '', zeit_von: r.zeit_von, zeit_bis: r.zeit_bis, ort: r.ort || '' })
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

    // Build list of dates (single day or range)
    const dates: string[] = []
    if (!editingId && form.datum_bis && form.datum_bis >= form.datum) {
      let d = form.datum
      while (d <= form.datum_bis) {
        dates.push(d)
        d = addDays(d, 1)
      }
    } else {
      dates.push(form.datum)
    }

    for (const datum of dates) {
      const conflict = checkConflict(selected.id, datum, form.zeit_von, form.zeit_bis, editingId)
      if (conflict) { alert('Überschneidung: ' + conflict); return }
    }
    for (const s of extraSlots) {
      if (!s.zeit_von || !s.zeit_bis) continue
      for (const datum of dates) {
        const c2 = checkConflict(selected.id, datum, s.zeit_von, s.zeit_bis, null)
        if (c2) { alert('Überschneidung (Zeitblock): ' + c2); return }
      }
    }

    setSaving(true)
    try {
      if (editingId) {
        const { error } = await getSupabase().from('schedule').update({ caregiver_id: selected.id, client_id: form.client_id, datum: form.datum, zeit_von: form.zeit_von, zeit_bis: form.zeit_bis, ort: form.ort || null }).eq('id', editingId)
        if (error) throw new Error(error.message)
      } else {
        const rows = dates.map(datum => ({ caregiver_id: selected.id, client_id: form.client_id, datum, zeit_von: form.zeit_von, zeit_bis: form.zeit_bis, ort: form.ort || null }))
        const { error } = await getSupabase().from('schedule').insert(rows)
        if (error) throw new Error(error.message)
      }

      if (!editingId && extraSlots.length > 0) {
        const extras = extraSlots.filter(s => s.zeit_von && s.zeit_bis && s.zeit_von < s.zeit_bis)
        if (extras.length > 0) {
          const extraRows = dates.flatMap(datum => extras.map(s => ({ caregiver_id: selected.id, client_id: s.client_id || form.client_id, datum, zeit_von: s.zeit_von, zeit_bis: s.zeit_bis, ort: s.ort || null })))
          const { error: e2 } = await getSupabase().from('schedule').insert(extraRows)
          if (e2) throw new Error(e2.message)
        }
      }

      setShowForm(false)
      setSaving(false)
      const n = dates.length
      setSavedMsg(n > 1 ? `${n} Termine gespeichert!` : 'Termin gespeichert!')
      setTimeout(() => setSavedMsg(''), 3000)
      await load()
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + (err?.message || String(err)))
      setSaving(false)
    }
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
              <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 }}>←</button>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Einsatzplanung</h1>
            </div>
            <button onClick={openOpenNew} style={{ padding: '8px 16px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px var(--rose-glow)', flexShrink: 0, whiteSpace: 'nowrap', marginLeft: 10 }}>+ Neuer Einsatz</button>
          </div>

          {showOpenForm && (
            <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '24px 20px', marginBottom: 20, boxShadow: 'var(--shadow-md)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, color: 'var(--dark)', margin: '0 0 16px' }}>{editingOpenId ? 'Einsatz bearbeiten' : editingOpenRuleId ? 'Festen Termin bearbeiten' : 'Neuer Einsatz'}</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                <select value={openForm.client_id} onChange={e => setOpenForm(f => ({ ...f, client_id: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                  <option value="">– Klient –</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={openForm.caregiver_id} onChange={e => setOpenForm(f => ({ ...f, caregiver_id: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                  <option value="">– noch nicht zugeteilt –</option>
                  {caregivers.map(c => <option key={c.id} value={c.id}>{c.name}{c.absent ? ' (abwesend)' : ''}</option>)}
                </select>
                {!openRecurring && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label style={{ fontSize: 13, color: 'var(--mid)' }}>Von-Datum *
                      <input type="date" value={openForm.datum} onChange={e => setOpenForm(f => ({ ...f, datum: e.target.value }))} style={{ display: 'block', marginTop: 4, padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, width: '100%', boxSizing: 'border-box' }} />
                    </label>
                    <label style={{ fontSize: 13, color: 'var(--mid)' }}>Bis-Datum (opt.)
                      <input type="date" value={openForm.datum_bis} min={openForm.datum} onChange={e => setOpenForm(f => ({ ...f, datum_bis: e.target.value }))} style={{ display: 'block', marginTop: 4, padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, width: '100%', boxSizing: 'border-box' }} />
                    </label>
                  </div>
                )}
                <label style={{ fontSize: 13, color: 'var(--mid)' }}>Von
                  <TimeSelect value={openForm.zeit_von} onChange={v => setOpenForm(f => ({ ...f, zeit_von: v }))} style={{ marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 13, color: 'var(--mid)' }}>Bis
                  <TimeSelect value={openForm.zeit_bis} onChange={v => setOpenForm(f => ({ ...f, zeit_bis: v }))} style={{ marginTop: 4 }} />
                </label>
                <input placeholder="Ort (optional)" value={openForm.ort} onChange={e => setOpenForm(f => ({ ...f, ort: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />

                {!editingOpenId && !openRecurring && (
                  <>
                    {openExtraSlots.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {openExtraSlots.map((s, i) => (
                          <div key={i} style={{ background: 'rgba(180,60,60,.04)', border: '1px solid rgba(180,60,60,.15)', borderRadius: 'var(--r-sm)', padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rose)', letterSpacing: '.5px' }}>ZEITBLOCK {i + 2}</span>
                              <button type="button" onClick={() => setOpenExtraSlots(sl => sl.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              <label style={{ fontSize: 13, color: 'var(--mid)' }}>Von
                                <TimeSelect value={s.zeit_von} onChange={v => setOpenExtraSlots(sl => sl.map((x, j) => j === i ? { ...x, zeit_von: v } : x))} style={{ marginTop: 4 }} />
                              </label>
                              <label style={{ fontSize: 13, color: 'var(--mid)' }}>Bis
                                <TimeSelect value={s.zeit_bis} onChange={v => setOpenExtraSlots(sl => sl.map((x, j) => j === i ? { ...x, zeit_bis: v } : x))} style={{ marginTop: 4 }} />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={() => setOpenExtraSlots(sl => [...sl, { client_id: '', zeit_von: '', zeit_bis: '', ort: '' }])} style={{ padding: '9px 16px', borderRadius: 'var(--r-pill)', border: '1.5px dashed rgba(180,60,60,.3)', background: 'rgba(180,60,60,.03)', color: 'var(--rose)', fontSize: 13, cursor: 'pointer', width: '100%', fontWeight: 500 }}>+ Weiterer Zeitblock am selben Tag</button>
                  </>
                )}

                {!editingOpenId && (
                  <div style={{ borderTop: '1px solid rgba(28,24,20,.08)', paddingTop: 12 }}>
                    {!editingOpenRuleId && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--dark)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={openRecurring} onChange={e => setOpenRecurring(e.target.checked)} />
                        Fester Termin (z.B. Mo–Do, läuft bis er beendet wird)
                      </label>
                    )}
                    {openRecurring && (
                      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {WEEKDAYS.map((wd, i) => (
                            <button key={wd} type="button" onClick={() => toggleOpenRecurDay(i)} style={{ padding: '6px 12px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: openRecurDays.includes(i) ? 'var(--rose)' : '#fff', color: openRecurDays.includes(i) ? '#fff' : 'var(--dark)', fontSize: 13, cursor: 'pointer' }}>{wd}</button>
                          ))}
                        </div>
                        <label style={{ fontSize: 13, color: 'var(--mid)' }}>Beginnt am
                          <input type="date" value={openForm.datum} onChange={e => setOpenForm(f => ({ ...f, datum: e.target.value }))} style={{ display: 'block', marginTop: 4, padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, width: '100%', boxSizing: 'border-box' }} />
                        </label>
                        <p style={{ fontSize: 13, color: 'var(--mid)', margin: 0 }}>Läuft automatisch weiter, bis der Termin beendet wird.</p>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  {editingOpenId && <button onClick={() => del(editingOpenId).then(() => setShowOpenForm(false))} style={{ padding: '10px 16px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(196,90,90,.3)', background: '#fff', color: '#c45a5a', cursor: 'pointer', fontSize: 13, marginRight: 'auto' }}>Löschen</button>}
                  {editingOpenRuleId && <button onClick={() => delRule(editingOpenRuleId).then(() => setShowOpenForm(false))} style={{ padding: '10px 16px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(196,90,90,.3)', background: '#fff', color: '#c45a5a', cursor: 'pointer', fontSize: 13, marginRight: 'auto' }}>Festen Termin beenden</button>}
                  <button onClick={() => setShowOpenForm(false)} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Abbrechen</button>
                  <button onClick={saveOpen} disabled={savingOpen || !openForm.client_id || !openForm.zeit_von || !openForm.zeit_bis || (openRecurring ? openRecurDays.length === 0 : !openForm.datum)} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer', opacity: savingOpen ? 0.6 : 1 }}>{savingOpen ? 'Speichern…' : 'Speichern'}</button>
                </div>
              </div>
            </div>
          )}

          {openRules.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 17, color: 'var(--dark)', margin: '0 0 8px' }}>Feste Termine ohne Betreuer</h2>
              {openRules.map(r => (
                <div key={r.id} onClick={() => openOpenEditRule(r)} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderLeft: '4px solid var(--rose)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{weekdaysLabel(r.weekdays)} · {hm(r.zeit_von)}–{hm(r.zeit_bis)}</div>
                    <div style={{ fontSize: 14, color: 'var(--mid)', marginTop: 2 }}>{clientName(r.client_id)}{r.ort ? ` · ${r.ort}` : ''}</div>
                  </div>
                  <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 'var(--r-pill)', background: 'var(--rose)', color: '#fff', flexShrink: 0 }}>zu vergeben</span>
                </div>
              ))}
            </div>
          )}

          {openEntries.length > 0 && (() => {
            const urgentEntries = openEntries.filter(e => e.datum <= addDays(todayStr(), 3))
            const futureEntries = openEntries.filter(e => e.datum > addDays(todayStr(), 3))
            const renderEntry = (e: Entry, urgent: boolean) => (
              <div key={e.id} onClick={() => openOpenEdit(e)} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderLeft: e.cancelled_by ? '4px solid #C0392B' : urgent ? '4px solid var(--rose)' : undefined }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: e.cancelled_by ? '#C0392B' : urgent ? 'var(--rose)' : 'var(--dark)', fontSize: 15 }}>{fmtDate(e.datum)} · {hm(e.zeit_von)}–{hm(e.zeit_bis)}</div>
                  <div style={{ fontSize: 14, color: 'var(--mid)', marginTop: 2 }}>{clientName(e.client_id)}{e.ort ? ` · ${e.ort}` : ''}</div>
                  {e.cancelled_by && <div style={{ fontSize: 12, color: '#C0392B', marginTop: 3 }}>Storniert von {e.cancelled_by} – neu vergeben?</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 10 }}>
                  {e.cancelled_by && <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 'var(--r-pill)', background: '#C0392B', color: '#fff' }}>storniert</span>}
                  {!e.cancelled_by && urgent && <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 'var(--r-pill)', background: 'var(--rose)', color: '#fff' }}>dringend</span>}
                </div>
              </div>
            )
            return (
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 17, color: 'var(--dark)', margin: '0 0 8px' }}>Einzeltermine ohne Betreuer ({openEntries.length})</h2>
                {urgentEntries.map(e => renderEntry(e, true))}
                {futureEntries.length > 0 && (
                  <>
                    <div onClick={() => setShowFutureOpen(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', cursor: 'pointer', color: 'var(--mid)', fontSize: 13 }}>
                      <span>{showFutureOpen ? '▲' : '▼'}</span>
                      <span>{futureEntries.length} weitere{futureEntries.length === 1 ? 'r' : ''} Termin{futureEntries.length === 1 ? '' : 'e'} (später)</span>
                    </div>
                    {showFutureOpen && futureEntries.map(e => renderEntry(e, false))}
                  </>
                )}
              </div>
            )
          })()}

          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 17, color: 'var(--dark)', margin: '0 0 10px' }}>Betreuer einteilen</h2>
          <input placeholder="Betreuer suchen…" value={caregiverSearch} onChange={e => setCaregiverSearch(e.target.value)} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, width: '100%', boxSizing: 'border-box', marginBottom: 10, background: '#fff' }} />

          {caregivers.length === 0
            ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 40, textAlign: 'center', color: 'var(--mid)' }}>Noch keine Betreuer angelegt.</div>
            : caregivers.filter(c => c.name.toLowerCase().includes(caregiverSearch.toLowerCase())).map(c => {
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

        {savedMsg && (
          <div style={{ background: 'var(--sage)', color: '#fff', borderRadius: 'var(--r-md)', padding: '12px 18px', marginBottom: 16, fontWeight: 500, fontSize: 15, textAlign: 'center' }}>{savedMsg}</div>
        )}

        {showForm && (
          <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '24px 20px', marginBottom: 20, boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, color: 'var(--dark)', margin: '0 0 16px' }}>{editingId ? 'Termin bearbeiten' : editingRuleId ? 'Festen Termin bearbeiten' : 'Neuer Termin'}</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                <option value="">– Klient –</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              {!recurring && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={{ fontSize: 13, color: 'var(--mid)' }}>Von-Datum *
                    <input type="date" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} style={{ display: 'block', marginTop: 4, padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, width: '100%', boxSizing: 'border-box' }} />
                  </label>
                  <label style={{ fontSize: 13, color: 'var(--mid)' }}>Bis-Datum (opt.)
                    <input type="date" value={form.datum_bis} min={form.datum} onChange={e => setForm(f => ({ ...f, datum_bis: e.target.value }))} style={{ display: 'block', marginTop: 4, padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, width: '100%', boxSizing: 'border-box' }} />
                  </label>
                </div>
              )}

              <label style={{ fontSize: 13, color: 'var(--mid)' }}>Von
                <TimeSelect value={form.zeit_von} onChange={v => setForm(f => ({ ...f, zeit_von: v }))} style={{ marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 13, color: 'var(--mid)' }}>Bis
                <TimeSelect value={form.zeit_bis} onChange={v => setForm(f => ({ ...f, zeit_bis: v }))} style={{ marginTop: 4 }} />
              </label>
              <input placeholder="Ort (optional)" value={form.ort} onChange={e => setForm(f => ({ ...f, ort: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />

              {!editingId && !recurring && (
                <>
                  {extraSlots.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {extraSlots.map((s, i) => (
                        <div key={i} style={{ background: 'rgba(180,60,60,.04)', border: '1px solid rgba(180,60,60,.15)', borderRadius: 'var(--r-sm)', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rose)', letterSpacing: '.5px' }}>ZEITBLOCK {i + 2}</span>
                            <button type="button" onClick={() => setExtraSlots(sl => sl.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <label style={{ fontSize: 13, color: 'var(--mid)' }}>Von
                              <TimeSelect value={s.zeit_von} onChange={v => setExtraSlots(sl => sl.map((x, j) => j === i ? { ...x, zeit_von: v } : x))} style={{ marginTop: 4 }} />
                            </label>
                            <label style={{ fontSize: 13, color: 'var(--mid)' }}>Bis
                              <TimeSelect value={s.zeit_bis} onChange={v => setExtraSlots(sl => sl.map((x, j) => j === i ? { ...x, zeit_bis: v } : x))} style={{ marginTop: 4 }} />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => setExtraSlots(sl => [...sl, { client_id: '', zeit_von: '', zeit_bis: '', ort: '' }])} style={{ padding: '9px 16px', borderRadius: 'var(--r-pill)', border: '1.5px dashed rgba(180,60,60,.3)', background: 'rgba(180,60,60,.03)', color: 'var(--rose)', fontSize: 13, cursor: 'pointer', width: '100%', fontWeight: 500 }}>+ Weiterer Zeitblock am selben Tag</button>
                </>
              )}

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
                  <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{weekdaysLabel(r.weekdays)} · {hm(r.zeit_von)}–{hm(r.zeit_bis)}</div>
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
                    <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{fmtDate(e.datum)} · {hm(e.zeit_von)}–{hm(e.zeit_bis)}</div>
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
                          <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 14 }}>{hm(e.zeit_von)}–{hm(e.zeit_bis)}</div>
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
