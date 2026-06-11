import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'
import TimeSelect from '../../components/TimeSelect'

type Activity = {
  id: string
  datum: string
  zeit_von: string
  zeit_bis: string
  unterschrift: string
  caregiver_id: string | null
  client_id: string | null
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
  const [caregiverOptions, setCaregiverOptions] = useState<{ id: string; name: string }[]>([])
  const [clientOptions, setClientOptions] = useState<{ id: string; name: string }[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ caregiver_id: '', client_id: '', datum: '', zeit_von: '', zeit_bis: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data: d } = await getSupabase()
      .from('activities')
      .select('id,datum,zeit_von,zeit_bis,unterschrift,caregiver_id,client_id,caregiver:caregivers(name),client:clients(name)')
      .order('datum', { ascending: false })
    setEntries((d as any) || [])
    setLoading(false)
  }

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const [{ data: cgs }, { data: cls }] = await Promise.all([
        getSupabase().from('caregivers').select('id,name').order('name'),
        getSupabase().from('clients').select('id,name').order('name'),
      ])
      setCaregiverOptions((cgs as any) || [])
      setClientOptions((cls as any) || [])
      await load()
    })
  }, [router])

  function edit(e: Activity) {
    setEditingId(e.id)
    setEditForm({ caregiver_id: e.caregiver_id || '', client_id: e.client_id || '', datum: e.datum, zeit_von: e.zeit_von, zeit_bis: e.zeit_bis })
  }

  async function saveEdit() {
    if (!editingId) return
    setSaving(true)
    await getSupabase().from('activities').update({
      caregiver_id: editForm.caregiver_id || null,
      client_id: editForm.client_id || null,
      datum: editForm.datum,
      zeit_von: editForm.zeit_von,
      zeit_bis: editForm.zeit_bis,
    }).eq('id', editingId)
    setEditingId(null)
    setSaving(false)
    await load()
  }

  async function delEntry(id: string) {
    if (!confirm('Eintrag löschen?')) return
    await getSupabase().from('activities').delete().eq('id', id)
    await load()
  }

  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ caregiver_id: '', client_id: '', datum: '', zeit_von: '', zeit_bis: '' })

  async function createEntry() {
    if (!newForm.caregiver_id || !newForm.client_id || !newForm.datum || !newForm.zeit_von || !newForm.zeit_bis) return
    setSaving(true)
    await getSupabase().from('activities').insert({
      caregiver_id: newForm.caregiver_id,
      client_id: newForm.client_id,
      datum: newForm.datum,
      zeit_von: newForm.zeit_von,
      zeit_bis: newForm.zeit_bis,
    })
    setNewForm({ caregiver_id: '', client_id: '', datum: '', zeit_von: '', zeit_bis: '' })
    setShowNew(false)
    setSaving(false)
    await load()
  }

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
          <div className="no-print" style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 10 }}>
            <button onClick={() => setShowNew(!showNew)} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>{showNew ? 'Schließen' : '+ Neu'}</button>
            <button onClick={() => window.print()} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>Drucken</button>
          </div>
        </div>

        {showNew && (
          <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '24px 20px', marginBottom: 20, boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, color: 'var(--dark)', margin: '0 0 16px' }}>Neuer Einsatz</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <select value={newForm.caregiver_id} onChange={e => setNewForm(f => ({ ...f, caregiver_id: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                <option value="">– Betreuer –</option>
                {caregiverOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <select value={newForm.client_id} onChange={e => setNewForm(f => ({ ...f, client_id: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                <option value="">– Klient –</option>
                {clientOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <input type="date" value={newForm.datum} onChange={e => setNewForm(f => ({ ...f, datum: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <TimeSelect value={newForm.zeit_von} onChange={v => setNewForm(f => ({ ...f, zeit_von: v }))} />
                <TimeSelect value={newForm.zeit_bis} onChange={v => setNewForm(f => ({ ...f, zeit_bis: v }))} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowNew(false)} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Abbrechen</button>
                <button onClick={createEntry} disabled={saving || !newForm.caregiver_id || !newForm.client_id || !newForm.datum || !newForm.zeit_von || !newForm.zeit_bis} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Speichern…' : 'Speichern'}</button>
              </div>
            </div>
          </div>
        )}

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
                if (editingId === e.id) {
                  return (
                    <div key={e.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ display: 'grid', gap: 10 }}>
                        <select value={editForm.caregiver_id} onChange={ev => setEditForm(f => ({ ...f, caregiver_id: ev.target.value }))} style={{ padding: '10px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 14, background: '#fff' }}>
                          <option value="">– Betreuer –</option>
                          {caregiverOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                        <select value={editForm.client_id} onChange={ev => setEditForm(f => ({ ...f, client_id: ev.target.value }))} style={{ padding: '10px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 14, background: '#fff' }}>
                          <option value="">– Klient –</option>
                          {clientOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                        <input type="date" value={editForm.datum} onChange={ev => setEditForm(f => ({ ...f, datum: ev.target.value }))} style={{ padding: '10px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 14 }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <TimeSelect value={editForm.zeit_von} onChange={v => setEditForm(f => ({ ...f, zeit_von: v }))} style={{ fontSize: 14, padding: '10px 14px' }} />
                          <TimeSelect value={editForm.zeit_bis} onChange={v => setEditForm(f => ({ ...f, zeit_bis: v }))} style={{ fontSize: 14, padding: '10px 14px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingId(null)} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Abbrechen</button>
                          <button onClick={saveEdit} disabled={saving} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Speichern…' : 'Speichern'}</button>
                        </div>
                      </div>
                    </div>
                  )
                }
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
                        <div className="no-print" style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => edit(e)} style={{ padding: '4px 12px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', fontSize: 12, cursor: 'pointer' }}>Bearbeiten</button>
                          <button onClick={() => delEntry(e.id)} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>×</button>
                        </div>
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
