import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

type Caregiver = { id: string; name: string; email: string; phone: string; role: string }

export default function AdminUsers() {
  const router = useRouter()
  const [caregivers, setCaregivers] = useState<Caregiver[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'user' })

  async function load() {
    const { data } = await getSupabase().from('caregivers').select('id,name,email,phone,role').order('name')
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
    await getSupabase().from('caregivers').insert({ name: form.name, email: form.email, phone: form.phone, role: form.role })
    setForm({ name: '', email: '', phone: '', role: 'user' })
    setShowForm(false)
    setSaving(false)
    await load()
  }

  async function del(id: string) {
    if (!confirm('Betreuer löschen?')) return
    await getSupabase().from('caregivers').delete().eq('id', id)
    await load()
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 24, cursor: 'pointer', padding: 0 }}>←</button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 28, color: 'var(--dark)', margin: 0 }}>Betreuer</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '8px 16px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px var(--rose-glow)', flexShrink: 0, width: 'auto' }}>+ Neu</button>
        </div>

        {showForm && (
          <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '24px 20px', marginBottom: 20, boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, color: 'var(--dark)', margin: '0 0 16px' }}>Neuer Betreuer</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <input placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              <input placeholder="E-Mail" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              <input placeholder="Telefon" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff' }}>
                <option value="user">Betreuer</option>
                <option value="admin">Admin</option>
              </select>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Abbrechen</button>
                <button onClick={save} disabled={saving || !form.name} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer', opacity: saving || !form.name ? 0.6 : 1 }}>{saving ? 'Speichern…' : 'Speichern'}</button>
              </div>
            </div>
          </div>
        )}

        {caregivers.length === 0
          ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 40, textAlign: 'center', color: 'var(--mid)' }}>Noch keine Betreuer.<br /><span style={{ fontSize: 14 }}>Klicke auf "+ Neu" um einen Betreuer anzulegen.</span></div>
          : caregivers.map(c => (
            <div key={c.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 10, boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 16 }}>{c.name}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--r-pill)', background: c.role === 'admin' ? 'var(--rose)' : 'var(--sage)', color: '#fff' }}>{c.role === 'admin' ? 'Admin' : 'Betreuer'}</span>
                </div>
                {c.email && <div style={{ fontSize: 14, color: 'var(--mid)', marginTop: 2 }}>{c.email}</div>}
                {c.phone && <div style={{ fontSize: 14, color: 'var(--mid)' }}>{c.phone}</div>}
              </div>
              <button onClick={() => del(c.id)} style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 13, padding: '0 2px', lineHeight: 1 }}>×</button>
            </div>
          ))}
      </div>
    </div>
  )
}
