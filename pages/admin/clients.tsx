import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import { formatCardNumber } from '../../lib/cardNumber'

type Client = { id: string; name: string; street: string; zip: string; city: string; notes: string; birthdate: string | null; card_number: number | null }

function validUntil() {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toLocaleDateString('de-AT')
}

const BASE_URL = 'https://app.karohilft.at'

export default function AdminClients() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [printCard, setPrintCard] = useState<Client | null>(null)
  const [printSide, setPrintSide] = useState<'front' | 'back'>('front')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', street: '', zip: '', city: '', notes: '', birthdate: '' })

  async function load() {
    const { data } = await getSupabase().from('clients').select('id,name,street,zip,city,notes,birthdate,card_number').order('name')
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
    const payload = { name: form.name, street: form.street, zip: form.zip, city: form.city, notes: form.notes, birthdate: form.birthdate || null }
    if (editingId) {
      await getSupabase().from('clients').update(payload).eq('id', editingId)
    } else {
      await getSupabase().from('clients').insert(payload)
    }
    setForm({ name: '', street: '', zip: '', city: '', notes: '', birthdate: '' })
    setEditingId(null)
    setShowForm(false)
    setSaving(false)
    await load()
  }

  function edit(c: Client) {
    setForm({ name: c.name, street: c.street || '', zip: c.zip || '', city: c.city || '', notes: c.notes || '', birthdate: c.birthdate || '' })
    setEditingId(c.id)
    setShowForm(true)
  }

  async function del(id: string) {
    if (!confirm('Klient löschen? Geplante Einsätze im Stundenplan werden ebenfalls gelöscht. Bereits erfasste Tätigkeitsnachweise bleiben aus Dokumentationspflicht erhalten.')) return
    const { error } = await getSupabase().from('clients').delete().eq('id', id)
    if (error) { alert('Löschen fehlgeschlagen: ' + error.message); return }
    await load()
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      {/* Print overlay */}
      {printCard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <style>{`
            @media print {
              @page { size: 55mm 86mm; margin: 0; }
              html, body { width: 55mm !important; height: 86mm !important; overflow: hidden !important; margin: 0 !important; }
              body * { visibility: hidden; }
              #print-page-front, #print-page-front *, #print-page-back, #print-page-back * { visibility: visible; }
              #print-page-front, #print-page-back {
                position: fixed; top: 0; left: 0; width: 55mm !important; height: 86mm !important;
                margin: 0 !important;
              }
              #print-card, #print-card-back {
                position: absolute; top: 50%; left: 50%;
                width: 86mm !important; height: 54mm !important;
                transform: translate(-50%, -50%) rotate(90deg);
                margin: 0 !important; border: none !important; border-radius: 0 !important;
                box-shadow: none !important;
              }
              .printing-front #print-page-back { display: none !important; }
              .printing-back #print-page-front { display: none !important; }
            }
          `}</style>
          <div className={printSide === 'front' ? 'printing-front' : 'printing-back'} style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, margin: '0 0 20px', color: 'var(--dark)' }}>Klientenkarte drucken</h2>
            {/* Card preview – CR80 ratio 85.6:54 */}
            <div id="print-page-front" style={{ position: 'relative' }}>
            <div id="print-card" style={{ width: 320, height: 202, border: '1px solid #e0ddd9', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #FAF5EE 0%, #f5ede0 100%)', margin: '0 auto 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/karohilft-logo.png" alt="Karohilft" style={{ height: 36 }} />
                <span style={{ fontSize: 11, color: 'var(--mid)', letterSpacing: 1, textTransform: 'uppercase' }}>Klientenkarte</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: 'var(--dark)' }}>{printCard.name}</div>
                  {printCard.birthdate && <div style={{ fontSize: 12, color: 'var(--mid)' }}>geb. {new Date(printCard.birthdate).toLocaleDateString('de-AT')}</div>}
                  {printCard.card_number != null && <div style={{ fontSize: 12, color: 'var(--mid)' }}>{formatCardNumber(printCard.card_number)}</div>}
                </div>
                <QRCodeSVG value={`${BASE_URL}/eintrag?k=${printCard.id}`} size={72} bgColor="transparent" fgColor="#1C1814" />
              </div>
            </div>
            </div>
            <div id="print-page-back" style={{ position: 'relative' }}>
            <div id="print-card-back" style={{ width: 320, height: 202, border: '1px solid #e0ddd9', borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #FAF5EE 0%, #f5ede0 100%)', margin: '0 auto 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 10, color: 'var(--mid)', letterSpacing: 0.5 }}>GÜLTIG BIS {validUntil()}</span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontStyle: 'italic', color: 'var(--rose)' }}>Verlässlich an Ihrer Seite.</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--mid)', letterSpacing: 0.5 }}>
                +43 677 61482115 &nbsp;·&nbsp; office@karohilft.at &nbsp;·&nbsp; www.karohilft.at
              </div>
            </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setPrintCard(null)} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Schließen</button>
              <button onClick={() => { setPrintSide('front'); setTimeout(() => window.print(), 0) }} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', fontWeight: 500, cursor: 'pointer' }}>Vorderseite drucken</button>
              <button onClick={() => { setPrintSide('back'); setTimeout(() => window.print(), 0) }} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer' }}>Rückseite drucken</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
            <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 }}>←</button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Klienten</h1>
          </div>
          <button onClick={() => { if (showForm) { setEditingId(null); setForm({ name: '', street: '', zip: '', city: '', notes: '', birthdate: '' }) }; setShowForm(!showForm) }} style={{ padding: '8px 16px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px var(--rose-glow)', flexShrink: 0, whiteSpace: 'nowrap', marginLeft: 10 }}>{showForm ? 'Schließen' : '+ Neu'}</button>
        </div>

        {showForm && (
          <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '24px 20px', marginBottom: 20, boxShadow: 'var(--shadow-md)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, color: 'var(--dark)', margin: '0 0 16px' }}>{editingId ? 'Klient bearbeiten' : 'Neuer Klient'}</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <input placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              <input placeholder="Straße" value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
                <input placeholder="PLZ" value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
                <input placeholder="Ort" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              </div>
              <label style={{ fontSize: 13, color: 'var(--mid)' }}>Geburtsdatum
                <input type="date" value={form.birthdate} onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))} style={{ display: 'block', marginTop: 4, padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, width: '100%' }} />
              </label>
              <textarea placeholder="Notizen" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowForm(false); setEditingId(null); setForm({ name: '', street: '', zip: '', city: '', notes: '', birthdate: '' }) }} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Abbrechen</button>
                <button onClick={save} disabled={saving || !form.name} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer', opacity: saving || !form.name ? 0.6 : 1 }}>{saving ? 'Speichern…' : (editingId ? 'Speichern' : 'Speichern')}</button>
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
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  {c.birthdate && <>geb. {new Date(c.birthdate).toLocaleDateString('de-AT')} · </>}
                  {formatCardNumber(c.card_number)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => edit(c)} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', fontSize: 13, cursor: 'pointer' }}>Bearbeiten</button>
                <button onClick={() => setPrintCard(c)} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', fontSize: 13, cursor: 'pointer' }}>Karte</button>
                <button onClick={() => del(c.id)} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
