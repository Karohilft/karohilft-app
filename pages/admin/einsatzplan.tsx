import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

type Entry = {
  id: string
  caregiver_id: string
  client_id: string
  datum: string
  zeit_von: string
  zeit_bis: string
  ort: string | null
}

type Person = { id: string; name: string }

const COLORS = ['#C47C5A', '#7C9A82', '#8C7CA8', '#5A8CA8', '#C4A05A', '#A85A7C', '#5AA890', '#A87C5A']

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

export default function AdminEinsatzplan() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [caregivers, setCaregivers] = useState<Person[]>([])
  const [clients, setClients] = useState<Person[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [date, setDate] = useState(todayStr())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ caregiver_id: '', client_id: '', zeit_von: '', zeit_bis: '', ort: '' })

  async function load() {
    const [{ data: cgs }, { data: cls }, { data: sched }] = await Promise.all([
      getSupabase().from('caregivers').select('id,name').order('name'),
      getSupabase().from('clients').select('id,name').order('name'),
      getSupabase().from('schedule').select('id,caregiver_id,client_id,datum,zeit_von,zeit_bis,ort').eq('datum', date).order('zeit_von'),
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
  }, [date])

  const caregiverIds = useMemo(() => caregivers.map(c => c.id), [caregivers])
  const clientName = (id: string) => clients.find(c => c.id === id)?.name || '–'
  const caregiverName = (id: string) => caregivers.find(c => c.id === id)?.name || '–'

  function entriesFor(caregiverId: string) {
    return entries.filter(e => e.caregiver_id === caregiverId).sort((a, b) => a.zeit_von.localeCompare(b.zeit_von))
  }

  function isFreeAllDay(caregiverId: string) {
    return entriesFor(caregiverId).length === 0
  }

  function openNew() {
    setEditingId(null)
    setForm({ caregiver_id: '', client_id: '', zeit_von: '', zeit_bis: '', ort: '' })
    setShowForm(true)
  }

  function openEdit(e: Entry) {
    setEditingId(e.id)
    setForm({ caregiver_id: e.caregiver_id, client_id: e.client_id, zeit_von: e.zeit_von, zeit_bis: e.zeit_bis, ort: e.ort || '' })
    setShowForm(true)
  }

  async function save() {
    if (!form.caregiver_id || !form.client_id || !form.zeit_von || !form.zeit_bis) return
    if (form.zeit_von >= form.zeit_bis) { alert('Die Endzeit muss nach der Startzeit liegen.'); return }

    const conflict = entries.find(e =>
      e.caregiver_id === form.caregiver_id &&
      e.id !== editingId &&
      overlaps(form.zeit_von, form.zeit_bis, e.zeit_von, e.zeit_bis)
    )
    if (conflict) {
      alert(`Überschneidung: ${caregiverName(form.caregiver_id)} ist von ${conflict.zeit_von}–${conflict.zeit_bis} bereits bei ${clientName(conflict.client_id)} eingeteilt.`)
      return
    }

    setSaving(true)
    const payload = { caregiver_id: form.caregiver_id, client_id: form.client_id, datum: date, zeit_von: form.zeit_von, zeit_bis: form.zeit_bis, ort: form.ort || null }
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

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
            <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 }}>←</button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Einsatzplanung</h1>
          </div>
          <button onClick={openNew} style={{ padding: '8px 16px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px var(--rose-glow)', flexShrink: 0, whiteSpace: 'nowrap', marginLeft: 10 }}>+ Neu</button>
        </div>

        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, marginBottom: 20, background: '#fff' }} />

        {showForm && (
          <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '24px 20px', marginBottom: 20, boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, color: 'var(--dark)', margin: '0 0 16px' }}>{editingId ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <select value={form.caregiver_id} onChange={e => setForm(f => ({ ...f, caregiver_id: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                <option value="">– Betreuer –</option>
                {caregivers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                <option value="">– Klient –</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input type="time" value={form.zeit_von} onChange={e => setForm(f => ({ ...f, zeit_von: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
                <input type="time" value={form.zeit_bis} onChange={e => setForm(f => ({ ...f, zeit_bis: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              </div>
              <input placeholder="Ort (optional)" value={form.ort} onChange={e => setForm(f => ({ ...f, ort: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Abbrechen</button>
                <button onClick={save} disabled={saving || !form.caregiver_id || !form.client_id || !form.zeit_von || !form.zeit_bis} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Speichern…' : 'Speichern'}</button>
              </div>
            </div>
          </div>
        )}

        {caregivers.length === 0
          ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 40, textAlign: 'center', color: 'var(--mid)' }}>Noch keine Betreuer angelegt.</div>
          : caregivers.map(cg => {
            const list = entriesFor(cg.id)
            const free = isFreeAllDay(cg.id)
            const color = colorFor(cg.id, caregiverIds)
            return (
              <div key={cg.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 10, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: list.length ? 10 : 0 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 16 }}>{cg.name}</span>
                  {free && <span style={{ marginLeft: 'auto', fontSize: 12, padding: '2px 10px', borderRadius: 'var(--r-pill)', background: 'var(--sage)', color: '#fff' }}>frei</span>}
                </div>
                {list.map(e => (
                  <div key={e.id} onClick={() => openEdit(e)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 'var(--r-sm)', background: color + '22', borderLeft: `4px solid ${color}`, marginBottom: 6, cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 14 }}>{e.zeit_von} – {e.zeit_bis} · {clientName(e.client_id)}</div>
                      {e.ort && <div style={{ fontSize: 13, color: 'var(--mid)' }}>{e.ort}</div>}
                    </div>
                    <button onClick={ev => { ev.stopPropagation(); del(e.id) }} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )
          })}
      </div>
    </div>
  )
}
