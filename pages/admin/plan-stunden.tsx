import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

type Entry = {
  id: string
  date_from: string
  date_to: string
  hours: number
  notes: string
  caregiver: { name: string } | null
  client: { name: string } | null
}

type Caregiver = { id: string; name: string }
type Client = { id: string; name: string }

export default function PlanStunden() {
  const router = useRouter()
  const [entries, setEntries] = useState<Entry[]>([])
  const [caregivers, setCaregivers] = useState<Caregiver[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ caregiver_id: '', client_id: '', date_from: '', date_to: '', hours: '', notes: '' })

  async function load() {
    const sb = getSupabase()
    const [{ data: e }, { data: cg }, { data: cl }] = await Promise.all([
      sb.from('assignments_hours').select('id,date_from,date_to,hours,notes,caregiver:caregivers(name),client:clients(name)').order('date_from', { ascending: false }),
      sb.from('caregivers').select('id,name').order('name'),
      sb.from('clients').select('id,name').order('name'),
    ])
    setEntries((e as any) || [])
    setCaregivers((cg as any) || [])
    setClients((cl as any) || [])
    setLoading(false)
  }

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      load()
    })
  }, [router])

  async function save() {
    if (!form.caregiver_id || !form.client_id || !form.date_from || !form.hours) return
    setSaving(true)
    await getSupabase().from('assignments_hours').insert({
      caregiver_id: form.caregiver_id,
      client_id: form.client_id,
      date_from: form.date_from,
      date_to: form.date_to || form.date_from,
      hours: parseFloat(form.hours),
      notes: form.notes,
    })
    setForm({ caregiver_id: '', client_id: '', date_from: '', date_to: '', hours: '', notes: '' })
    setShowForm(false)
    setSaving(false)
    await load()
  }

  async function del(id: string) {
    if (!confirm('Eintrag löschen?')) return
    await getSupabase().from('assignments_hours').delete().eq('id', id)
    await load()
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 24, cursor: 'pointer', padding: 0 }}>←</button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 28, color: 'var(--dark)', margin: 0 }}>Stundenplan</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => window.print()} style={{ padding: '8px 16px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', fontSize: 14, cursor: 'pointer' }}>Drucken</button>
            <button onClick={() => setShowForm(!showForm)} style={{ padding: '8px 16px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px var(--rose-glow)' }}>+ Neu</button>
          </div>
        </div>

        {showForm && (
          <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '24px 20px', marginBottom: 20, boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, color: 'var(--dark)', margin: '0 0 16px' }}>Neuer Eintrag</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <select value={form.caregiver_id} onChange={e => setForm(f => ({ ...f, caregiver_id: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                <option value="">Betreuer wählen…</option>
                {caregivers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                <option value="">Klient wählen…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--mid)', display: 'block', marginBottom: 4 }}>Datum von</label>
                  <input type="date" value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} style={{ width: '100%', padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--mid)', display: 'block', marginBottom: 4 }}>Datum bis (optional)</label>
                  <input type="date" value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} style={{ width: '100%', padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--mid)', display: 'block', marginBottom: 4 }}>Stunden</label>
                <input type="number" step="0.5" min="0" placeholder="z.B. 4.5" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} style={{ width: '100%', padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, boxSizing: 'border-box' }} />
              </div>
              <textarea placeholder="Notizen (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Abbrechen</button>
                <button onClick={save} disabled={saving} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Speichern…' : 'Speichern'}</button>
              </div>
            </div>
          </div>
        )}

        {entries.length === 0
          ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 40, textAlign: 'center', color: 'var(--mid)' }}>Noch keine Einträge.<br /><span style={{ fontSize: 14 }}>Klicke auf "+ Neu" um einen Einsatz einzutragen.</span></div>
          : (
            <div>
              {entries.map(e => (
                <div key={e.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 10, boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 16 }}>
                      {(e.caregiver as any)?.name || '–'} → {(e.client as any)?.name || '–'}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--mid)', marginTop: 3 }}>
                      {e.date_from}{e.date_to && e.date_to !== e.date_from ? ` – ${e.date_to}` : ''} &nbsp;·&nbsp; <strong>{e.hours}h</strong>
                    </div>
                    {e.notes && <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2, fontStyle: 'italic' }}>{e.notes}</div>}
                  </div>
                  <button onClick={() => del(e.id)} style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 18, padding: '0 4px' }} title="Löschen">×</button>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: '12px 18px', background: 'rgba(196,124,90,.08)', borderRadius: 'var(--r-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--dark)' }}>Gesamt:</span>
                <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--rose)' }}>{entries.reduce((s, e) => s + (e.hours || 0), 0)}h</span>
              </div>
            </div>
          )}
      </div>
    </div>
  )
}
