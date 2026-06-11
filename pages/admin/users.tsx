import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import { formatCardNumber } from '../../lib/cardNumber'

type Caregiver = { id: string; name: string; email: string; phone: string; role: string; birthdate: string | null; card_number: number | null; absent: boolean }

export default function AdminUsers() {
  const router = useRouter()
  const [caregivers, setCaregivers] = useState<Caregiver[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'user', birthdate: '' })
  const [printCard, setPrintCard] = useState<Caregiver | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function load() {
    const { data } = await getSupabase().from('caregivers').select('id,name,email,phone,role,birthdate,card_number,absent').order('name')
    setCaregivers((data as Caregiver[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      load()
    })
  }, [router])

  async function save() {
    if (!form.name) return
    setSaving(true)
    const payload = { name: form.name, email: form.email, phone: form.phone, role: form.role, birthdate: form.birthdate || null }
    if (editingId) {
      await getSupabase().from('caregivers').update(payload).eq('id', editingId)
    } else {
      await getSupabase().from('caregivers').insert(payload)
    }
    setForm({ name: '', email: '', phone: '', role: 'user', birthdate: '' })
    setEditingId(null)
    setShowForm(false)
    setSaving(false)
    await load()
  }

  function edit(c: Caregiver) {
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', role: c.role, birthdate: c.birthdate || '' })
    setEditingId(c.id)
    setShowForm(true)
  }

  async function del(id: string) {
    if (!confirm('Betreuer löschen? Zugehörige Einsätze im Stundenplan werden ebenfalls gelöscht.')) return
    await getSupabase().from('activities').delete().eq('caregiver_id', id)
    const { error } = await getSupabase().from('caregivers').delete().eq('id', id)
    if (error) { alert('Löschen fehlgeschlagen: ' + error.message); return }
    await load()
  }

  async function toggleRole(id: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    await getSupabase().from('caregivers').update({ role: newRole }).eq('id', id)
    await load()
  }

  async function toggleAbsent(id: string, currentAbsent: boolean) {
    await getSupabase().from('caregivers').update({ absent: !currentAbsent }).eq('id', id)
    await load()
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      {printCard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, margin: '0 0 20px', color: 'var(--dark)' }}>Betreuerkarte drucken</h2>
            <div id="print-card" style={{ width: 320, height: 202, border: '1px solid #e0ddd9', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #FAF5EE 0%, #f5ede0 100%)', margin: '0 auto 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/karohilft-logo.png" alt="Karohilft" style={{ height: 36 }} />
                <span style={{ fontSize: 11, color: 'var(--mid)', letterSpacing: 1, textTransform: 'uppercase' }}>Betreuerkarte</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: 'var(--dark)' }}>{printCard.name}</div>
                  {printCard.birthdate && <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2 }}>geb. {new Date(printCard.birthdate).toLocaleDateString('de-AT')}</div>}
                  {printCard.card_number != null && <div style={{ fontSize: 12, color: 'var(--mid)' }}>{formatCardNumber(printCard.card_number)}</div>}
                </div>
                <QRCodeSVG value={`BEGIN:VCARD\nVERSION:3.0\nN:${printCard.name}\nORG:Karohilft\nTEL:${printCard.phone || ''}\nEMAIL:${printCard.email || ''}\nEND:VCARD`} size={72} bgColor="transparent" fgColor="#1C1814" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setPrintCard(null)} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Schließen</button>
              <button onClick={() => window.print()} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer' }}>Drucken</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
            <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 }}>←</button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Betreuer</h1>
          </div>
          <button onClick={() => { if (showForm) { setEditingId(null); setForm({ name: '', email: '', phone: '', role: 'user', birthdate: '' }) }; setShowForm(!showForm) }} style={{ padding: '8px 16px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px var(--rose-glow)', flexShrink: 0, whiteSpace: 'nowrap', marginLeft: 10 }}>{showForm ? 'Schließen' : '+ Neu'}</button>
        </div>

        {showForm && (
          <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '24px 20px', marginBottom: 20, boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, color: 'var(--dark)', margin: '0 0 16px' }}>{editingId ? 'Betreuer bearbeiten' : 'Neuer Betreuer'}</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <input placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              <input placeholder="E-Mail" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              <input placeholder="Telefon" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                <option value="user">Betreuer</option>
                <option value="admin">Admin</option>
              </select>
              <label style={{ fontSize: 13, color: 'var(--mid)' }}>Geburtsdatum
                <input type="date" value={form.birthdate} onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))} style={{ display: 'block', marginTop: 4, padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, width: '100%' }} />
              </label>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowForm(false); setEditingId(null); setForm({ name: '', email: '', phone: '', role: 'user', birthdate: '' }) }} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Abbrechen</button>
                <button onClick={save} disabled={saving || !form.name} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer', opacity: saving || !form.name ? 0.6 : 1 }}>{saving ? 'Speichern…' : 'Speichern'}</button>
              </div>
            </div>
          </div>
        )}

        {caregivers.length === 0
          ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 40, textAlign: 'center', color: 'var(--mid)' }}>Noch keine Betreuer.<br /><span style={{ fontSize: 14 }}>Klicke auf "+ Neu" um einen Betreuer anzulegen.</span></div>
          : caregivers.map(c => (
            <div key={c.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 10, boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 16 }}>{c.name}</span>
                  <button
                    onClick={() => toggleRole(c.id, c.role)}
                    title="Rolle ändern"
                    style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--r-pill)', background: c.role === 'admin' ? 'var(--rose)' : 'var(--sage)', color: '#fff', border: 'none', cursor: 'pointer', lineHeight: 1.4 }}
                  >{c.role === 'admin' ? 'Admin' : 'Betreuer'}</button>
                  <button
                    onClick={() => toggleAbsent(c.id, c.absent)}
                    title="Abwesenheit umschalten"
                    style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--r-pill)', background: c.absent ? 'var(--rose)' : 'transparent', color: c.absent ? '#fff' : 'var(--mid)', border: c.absent ? 'none' : '1.5px solid rgba(28,24,20,.12)', cursor: 'pointer', lineHeight: 1.4 }}
                  >{c.absent ? 'Abwesend' : 'Anwesend'}</button>
                </div>
                {c.email && <div style={{ fontSize: 14, color: 'var(--mid)', marginTop: 2 }}>{c.email}</div>}
                {c.phone && <div style={{ fontSize: 14, color: 'var(--mid)' }}>{c.phone}</div>}
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  {c.birthdate && <>geb. {new Date(c.birthdate).toLocaleDateString('de-AT')} · </>}
                  {formatCardNumber(c.card_number)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <button onClick={() => edit(c)} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', fontSize: 13, cursor: 'pointer' }}>Bearbeiten</button>
                <button onClick={() => setPrintCard(c)} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', fontSize: 13, cursor: 'pointer' }}>Karte</button>
                <button onClick={() => del(c.id)} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>×</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
