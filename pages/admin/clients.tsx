import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'
import { QRCodeSVG } from 'qrcode.react'

type Client = { id: string; name: string; street: string; zip: string; city: string; notes: string }

const BASE_URL = 'https://app.karohilft.at'

export default function AdminClients() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [printCard, setPrintCard] = useState<Client | null>(null)
  const [form, setForm] = useState({ name: '', street: '', zip: '', city: '', notes: '' })

  async function load() {
    const { data } = await getSupabase().from('clients').select('id,name,street,zip,city,notes').order('name')
    setClients((data as Client[]) || [])
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
    await getSupabase().from('clients').insert({ name: form.name, street: form.street, zip: form.zip, city: form.city, notes: form.notes })
    setForm({ name: '', street: '', zip: '', city: '', notes: '' })
    setShowForm(false)
    setSaving(false)
    await load()
  }

  async function del(id: string) {
    if (!confirm('Klient löschen?')) return
    await getSupabase().from('clients').delete().eq('id', id)
    await load()
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      {/* Print overlay */}
      {printCard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, margin: '0 0 20px', color: 'var(--dark)' }}>Klientenkarte drucken</h2>
            {/* Card preview – CR80 ratio 85.6:54 */}
            <div id="print-card" style={{ width: 320, height: 202, border: '1px solid #e0ddd9', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #FAF5EE 0%, #f5ede0 100%)', margin: '0 auto 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/karohilft-logo.png" alt="Karohilft" style={{ height: 28 }} />
                <span style={{ fontSize: 11, color: 'var(--mid)', letterSpacing: 1, textTransform: 'uppercase' }}>Klientenkarte</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: 'var(--dark)' }}>{printCard.name}</div>
                  {printCard.city && <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2 }}>{printCard.city}</div>}
                </div>
                <QRCodeSVG value={`${BASE_URL}/eintrag?k=${printCard.id}`} size={72} bgColor="transparent" fgColor="#1C1814" />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 24, cursor: 'pointer', padding: 0 }}>←</button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 28, color: 'var(--dark)', margin: 0 }}>Klienten</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '8px 16px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px var(--rose-glow)' }}>+ Neu</button>
        </div>

        {showForm && (
          <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '24px 20px', marginBottom: 20, boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, color: 'var(--dark)', margin: '0 0 16px' }}>Neuer Klient</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <input placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              <input placeholder="Straße" value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
                <input placeholder="PLZ" value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
                <input placeholder="Ort" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              </div>
              <textarea placeholder="Notizen" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Abbrechen</button>
                <button onClick={save} disabled={saving || !form.name} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer', opacity: saving || !form.name ? 0.6 : 1 }}>{saving ? 'Speichern…' : 'Speichern'}</button>
              </div>
            </div>
          </div>
        )}

        {clients.length === 0
          ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 40, textAlign: 'center', color: 'var(--mid)' }}>Noch keine Klienten.<br /><span style={{ fontSize: 14 }}>Klicke auf "+ Neu" um einen Klienten anzulegen.</span></div>
          : clients.map(c => (
            <div key={c.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 10, boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 16 }}>{c.name}</div>
                {(c.street || c.city) && <div style={{ fontSize: 14, color: 'var(--mid)', marginTop: 2 }}>{[c.street, c.zip, c.city].filter(Boolean).join(', ')}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => setPrintCard(c)} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', fontSize: 13, cursor: 'pointer' }}>🪪 Karte</button>
                <button onClick={() => del(c.id)} style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 13, padding: '0 2px', lineHeight: 1 }}>×</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
