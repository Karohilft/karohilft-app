import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import { formatCardNumber } from '../../lib/cardNumber'
import { hm } from '../../lib/time'

type Client = { id: string; name: string; street: string; zip: string; city: string; notes: string; birthdate: string | null; card_number: number | null; verify_token: string | null; telefon: string | null; kontakt_name: string | null; kontakt_telefon: string | null; kontakt_beziehung: string | null }
type AbrActivity = { id: string; datum: string; zeit_von: string; zeit_bis: string; caregiver: { name: string } | null }

function pickFile(onFile: (f: File) => void) {
  const input = document.createElement('input')
  input.type = 'file'
  input.onchange = () => { if (input.files?.[0]) onFile(input.files[0]) }
  input.click()
}

const DOC_BUCKET = 'live-in-docs'
const DOC_FOLDER = 'stunden-clients'

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
  const [form, setForm] = useState({ name: '', street: '', zip: '', city: '', notes: '', birthdate: '', telefon: '', kontakt_name: '', kontakt_telefon: '', kontakt_beziehung: '' })
  const [openClientId, setOpenClientId] = useState<string | null>(null)
  const [clientTab, setClientTab] = useState<'daten' | 'einsaetze' | 'dateien'>('daten')
  const [clientActivities, setClientActivities] = useState<AbrActivity[]>([])
  const [billedActivities, setBilledActivities] = useState<AbrActivity[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [abrechnung, setAbrechnung] = useState(false)
  const [showBilled, setShowBilled] = useState(false)
  const [docFiles, setDocFiles] = useState<{ name: string; path: string }[]>([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [archived, setArchived] = useState<Client[]>([])
  const [showArchive, setShowArchive] = useState(false)

  async function load() {
    const { data } = await getSupabase().from('clients').select('id,name,street,zip,city,notes,birthdate,card_number,verify_token,telefon,kontakt_name,kontakt_telefon,kontakt_beziehung').neq('live_in', true).is('deleted_at', null).order('name')
    setClients((data as Client[]) || [])
    const { data: arch } = await getSupabase().from('clients').select('id,name,street,zip,city,notes,birthdate,card_number,verify_token,telefon,kontakt_name,kontakt_telefon,kontakt_beziehung').neq('live_in', true).not('deleted_at', 'is', null).order('name')
    setArchived((arch as Client[]) || [])
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
    const payload = { name: form.name, street: form.street, zip: form.zip, city: form.city, notes: form.notes, birthdate: form.birthdate || null, telefon: form.telefon || null, kontakt_name: form.kontakt_name || null, kontakt_telefon: form.kontakt_telefon || null, kontakt_beziehung: form.kontakt_beziehung || null }
    if (editingId) {
      await getSupabase().from('clients').update(payload).eq('id', editingId)
    } else {
      await getSupabase().from('clients').insert(payload)
    }
    setForm({ name: '', street: '', zip: '', city: '', notes: '', birthdate: '', telefon: '', kontakt_name: '', kontakt_telefon: '', kontakt_beziehung: '' })
    setEditingId(null)
    setShowForm(false)
    setSaving(false)
    await load()
  }

  function edit(c: Client) {
    setForm({ name: c.name, street: c.street || '', zip: c.zip || '', city: c.city || '', notes: c.notes || '', birthdate: c.birthdate || '', telefon: c.telefon || '', kontakt_name: c.kontakt_name || '', kontakt_telefon: c.kontakt_telefon || '', kontakt_beziehung: c.kontakt_beziehung || '' })
    setEditingId(c.id)
    setShowForm(true)
  }

  async function del(id: string, name: string) {
    if (!confirm(`Klient „${name}" archivieren? Die Daten bleiben für 7 Jahre gespeichert.`)) return
    const { error } = await getSupabase().from('clients').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) { alert('Fehler: ' + error.message); return }
    await load()
  }

  async function restore(id: string) {
    await getSupabase().from('clients').update({ deleted_at: null }).eq('id', id)
    await load()
  }

  async function permanentDelete(id: string, name: string) {
    if (!confirm(`„${name}" endgültig löschen? Diese Aktion kann NICHT rückgängig gemacht werden.`)) return
    const { data: { session } } = await getSupabase().auth.getSession()
    const res = await fetch('/api/admin/permanent-delete-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert('Fehler: ' + (j.error || res.statusText)); return }
    await load()
  }

  async function loadActivities(clientId: string) {
    const [{ data: open }, { data: billed }] = await Promise.all([
      getSupabase().from('activities').select('id,datum,zeit_von,zeit_bis,caregiver:caregivers(name)').eq('client_id', clientId).eq('abgerechnet', false).order('datum', { ascending: false }).order('zeit_von', { ascending: false }),
      getSupabase().from('activities').select('id,datum,zeit_von,zeit_bis,caregiver:caregivers(name)').eq('client_id', clientId).eq('abgerechnet', true).order('datum', { ascending: false }).order('zeit_von', { ascending: false }),
    ])
    setClientActivities((open as any) || [])
    setBilledActivities((billed as any) || [])
    setSelectedIds(new Set())
  }

  async function loadDocFiles(clientId: string) {
    const { data } = await getSupabase().storage.from(DOC_BUCKET).list(`${DOC_FOLDER}/${clientId}`)
    setDocFiles((data || []).map(f => ({ name: f.name, path: `${DOC_FOLDER}/${clientId}/${f.name}` })))
  }

  async function uploadDocFile(clientId: string, file: File) {
    setUploadingDoc(true)
    const path = `${DOC_FOLDER}/${clientId}/${Date.now()}_${file.name}`
    const { error } = await getSupabase().storage.from(DOC_BUCKET).upload(path, file)
    if (error) alert('Upload fehlgeschlagen: ' + error.message)
    else await loadDocFiles(clientId)
    setUploadingDoc(false)
  }

  async function deleteDocFile(path: string, clientId: string) {
    if (!confirm('Datei löschen?')) return
    await getSupabase().storage.from(DOC_BUCKET).remove([path])
    await loadDocFiles(clientId)
  }

  function getDocUrl(path: string) {
    return getSupabase().storage.from(DOC_BUCKET).getPublicUrl(path).data.publicUrl
  }

  function toggleClient(id: string) {
    if (openClientId === id) {
      setOpenClientId(null)
      setDocFiles([])
    } else {
      setOpenClientId(id)
      setClientTab('daten')
      setClientActivities([])
      setSelectedIds(new Set())
      loadDocFiles(id)
    }
  }

  async function openEinsaetze(clientId: string) {
    setClientTab('einsaetze')
    await loadActivities(clientId)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function markAbgerechnet() {
    if (selectedIds.size === 0) return
    setAbrechnung(true)
    await getSupabase().from('activities').update({ abgerechnet: true }).in('id', [...selectedIds])
    await loadActivities(openClientId!)
    setAbrechnung(false)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      {/* Print overlay */}
      {printCard && (
        <>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <style>{`
            .print-area { display: none; }
            @media print {
              @page { size: 86mm 55mm; margin: 0; }
              html, body {
                margin: 0 !important; padding: 0 !important;
                width: 86mm !important; height: auto !important;
                overflow: visible !important; background: white !important;
              }
              body > *:not(.print-area) { display: none !important; }
              .print-area {
                display: block !important;
                width: 86mm !important; height: auto !important; margin: 0 !important; padding: 0 !important; overflow: visible !important;
              }
              .print-page {
                display: block !important; position: relative !important;
                width: 86mm !important; min-width: 86mm !important; max-width: 86mm !important;
                height: 55mm !important; min-height: 55mm !important; max-height: 55mm !important;
                margin: 0 !important; padding: 0 !important;
                overflow: hidden !important;
                page-break-after: always !important; break-after: page !important;
                page-break-inside: avoid !important; break-inside: avoid !important;
              }
              .print-page:last-child { page-break-after: auto !important; break-after: auto !important; }
              .print-area[data-side="front"] .print-page.back { display: none !important; }
              .print-area[data-side="back"] .print-page.front { display: none !important; }
              .card-print {
                position: absolute !important; left: 2mm !important; top: 2mm !important;
                width: 82mm !important; height: 51mm !important;
                margin: 0 !important; box-sizing: border-box !important; overflow: hidden !important;
              }
            }
          `}</style>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, margin: '0 0 20px', color: 'var(--dark)' }}>Klientenkarte drucken</h2>
            {/* Card preview – CR80 ratio 85.6:54 */}
            <div style={{ width: 320, height: 202, border: '1px solid #e0ddd9', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #FAF5EE 0%, #f5ede0 100%)', margin: '0 auto 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/karohilft-logo.svg" alt="Karohilft" style={{ height: 48 }} />
                <span style={{ fontSize: 9, color: 'var(--mid)', letterSpacing: 1, textTransform: 'uppercase' }}>ID Card</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: 'var(--dark)' }}>{printCard.name}</div>
                  {printCard.birthdate && <div style={{ fontSize: 12, color: 'var(--mid)' }}>geb. {new Date(printCard.birthdate).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>}
                  {printCard.card_number != null && <div style={{ fontSize: 12, color: 'var(--rose)', fontWeight: 600 }}>{formatCardNumber(printCard.card_number)}</div>}
                </div>
                <QRCodeSVG value={`https://app.karohilft.at/verify/${printCard.verify_token || formatCardNumber(printCard.card_number)}`} size={72} bgColor="transparent" fgColor="#1C1814" />
              </div>
            </div>
            <div style={{ width: 320, height: 202, border: '1px solid #e0ddd9', borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #FAF5EE 0%, #f5ede0 100%)', margin: '0 auto 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 10, color: 'var(--mid)', letterSpacing: 0.5 }}>GÜLTIG BIS {validUntil()}</span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontStyle: 'italic', color: 'var(--rose)' }}>Verlässlich an Ihrer Seite.</span>
                <span style={{ fontSize: 10, color: 'var(--mid)', letterSpacing: 0.5 }}>Ihr Team von Karohilft</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--mid)', letterSpacing: 0.5 }}>
                +43 677 61482115 &nbsp;·&nbsp; office@karohilft.at &nbsp;·&nbsp; www.karohilft.at
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setPrintCard(null)} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Schließen</button>
              <button onClick={() => { setPrintSide('front'); setTimeout(() => window.print(), 100) }} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer' }}>Vorderseite drucken</button>
              <button onClick={() => { setPrintSide('back'); setTimeout(() => window.print(), 100) }} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer' }}>Rückseite drucken</button>
            </div>
          </div>
        </div>

          {createPortal(
          <div className="print-area" data-side={printSide}>
            <div className="print-page front">
              <div id="print-card" className="card-print front" style={{ position: 'relative', background: '#fff' }}>
                <div style={{ position: 'absolute', left: 14, top: 14 }}>
                  <img src="/karohilft-logo.svg" alt="Karohilft" style={{ height: 55 }} />
                </div>
                <div style={{ position: 'absolute', right: 20, top: 22, fontSize: 9, color: 'var(--mid)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  ID Card
                </div>
                <div style={{ position: 'absolute', left: 20, bottom: 28 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: 'var(--dark)' }}>{printCard.name}</div>
                  {printCard.birthdate && <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 4 }}>geb. {new Date(printCard.birthdate).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>}
                  {printCard.card_number != null && <div style={{ fontSize: 12, color: 'var(--rose)', fontWeight: 600, marginTop: 2 }}>{formatCardNumber(printCard.card_number)}</div>}
                </div>
                <div style={{ position: 'absolute', right: 20, bottom: 28 }}>
                  <QRCodeSVG value={`https://app.karohilft.at/verify/${printCard.verify_token || formatCardNumber(printCard.card_number)}`} size={72} bgColor="transparent" fgColor="#1C1814" />
                </div>
              </div>
            </div>
            <div className="print-page back">
              <div id="print-card-back" className="card-print back" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#fff', padding: '14px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 10, color: 'var(--mid)', letterSpacing: 0.5 }}>GÜLTIG BIS {validUntil()}</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontStyle: 'italic', color: 'var(--rose)' }}>Verlässlich an Ihrer Seite.</span>
                  <span style={{ fontSize: 10, color: 'var(--mid)', letterSpacing: 0.5 }}>Ihr Team von Karohilft</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--mid)', letterSpacing: 0.5 }}>
                  +43 677 61482115 &nbsp;·&nbsp; office@karohilft.at &nbsp;·&nbsp; www.karohilft.at
                </div>
              </div>
            </div>
          </div>, document.body)}
        </>
      )}

      <style>{`
        @media (max-width: 600px) {
          .cl-card-row { flex-direction: column !important; align-items: stretch !important; }
          .cl-card-row .cl-btns { justify-content: flex-start !important; margin-top: 10px; }
          .cl-card-row .cl-btns button { padding: 5px 10px !important; font-size: 12px !important; }
        }
      `}</style>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
            <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 }}>←</button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Klienten</h1>
          </div>
          <button onClick={() => { if (showForm) { setEditingId(null); setForm({ name: '', street: '', zip: '', city: '', notes: '', birthdate: '', kontakt_name: '', kontakt_telefon: '', kontakt_beziehung: '' }) }; setShowForm(!showForm) }} style={{ padding: '8px 16px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px var(--rose-glow)', flexShrink: 0, whiteSpace: 'nowrap', marginLeft: 10 }}>{showForm ? 'Schließen' : '+ Neu'}</button>
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
              <input placeholder="Telefon" value={form.telefon} onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              <label style={{ fontSize: 13, color: 'var(--mid)' }}>Geburtsdatum
                <input type="date" value={form.birthdate} onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))} style={{ display: 'block', marginTop: 4, padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, width: '100%' }} />
              </label>
              <textarea placeholder="Notizen" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, resize: 'vertical' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mid)', marginTop: 4 }}>Kontaktperson</div>
              <input placeholder="Name (z.B. Maria Müller)" value={form.kontakt_name} onChange={e => setForm(f => ({ ...f, kontakt_name: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input placeholder="Telefon" value={form.kontakt_telefon} onChange={e => setForm(f => ({ ...f, kontakt_telefon: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
                <input placeholder="Beziehung (z.B. Tochter)" value={form.kontakt_beziehung} onChange={e => setForm(f => ({ ...f, kontakt_beziehung: e.target.value }))} style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15 }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowForm(false); setEditingId(null); setForm({ name: '', street: '', zip: '', city: '', notes: '', birthdate: '', kontakt_name: '', kontakt_telefon: '', kontakt_beziehung: '' }) }} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Abbrechen</button>
                <button onClick={save} disabled={saving || !form.name} style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer', opacity: saving || !form.name ? 0.6 : 1 }}>{saving ? 'Speichern…' : (editingId ? 'Speichern' : 'Speichern')}</button>
              </div>
            </div>
          </div>
        )}

        {clients.length === 0
          ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 40, textAlign: 'center', color: 'var(--mid)' }}>Noch keine Klienten.<br /><span style={{ fontSize: 14 }}>Klicke auf "+ Neu" um einen Klienten anzulegen.</span></div>
          : clients.map(c => {
            const panelOpen = openClientId === c.id
            const btnStyle = { padding: '6px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', fontSize: 13, cursor: 'pointer' }
            return (
              <div key={c.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 10, boxShadow: 'var(--shadow-sm)' }}>
                <div className="cl-card-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 16 }}>{c.name}</div>
                    {(c.street || c.city) && <div style={{ fontSize: 14, color: 'var(--mid)', marginTop: 2 }}>{[c.street, c.zip, c.city].filter(Boolean).join(', ')}</div>}
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                      {c.birthdate && <>geb. {new Date(c.birthdate).toLocaleDateString('de-AT')} · </>}
                      {formatCardNumber(c.card_number)}
                    </div>
                    {c.telefon && <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>📞 {c.telefon}</div>}
                    {c.kontakt_name && <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>👤 {c.kontakt_name}{c.kontakt_beziehung ? ` (${c.kontakt_beziehung})` : ''}{c.kontakt_telefon ? ` · ${c.kontakt_telefon}` : ''}</div>}
                  </div>
                  <div className="cl-btns" style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button onClick={() => edit(c)} style={btnStyle}>Bearbeiten</button>
                    <button onClick={() => { if (panelOpen && clientTab === 'dateien') { setOpenClientId(null) } else { setOpenClientId(c.id); setClientTab('dateien' as any); loadDocFiles(c.id) } }} style={{ ...btnStyle, background: panelOpen && clientTab === 'dateien' ? 'var(--cream)' : '#fff' }}>Dateien</button>
                    <button onClick={() => setPrintCard(c)} style={btnStyle}>Karte</button>
                    <button onClick={() => { if (panelOpen && clientTab === 'einsaetze') { setOpenClientId(null) } else { setOpenClientId(c.id); setClientTab('einsaetze'); loadActivities(c.id) } }} style={{ ...btnStyle, background: panelOpen && clientTab === 'einsaetze' ? 'var(--cream)' : '#fff' }}>Einsätze</button>
                    <button onClick={() => del(c.id, c.name)} style={{ background: 'transparent', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>×</button>
                  </div>
                </div>

                {panelOpen && clientTab === ('dateien' as any) && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(28,24,20,.08)' }}>
                    {docFiles.length === 0 && <div style={{ fontSize: 13, color: 'var(--mid)', fontStyle: 'italic', marginBottom: 8 }}>Keine Dateien.</div>}
                    {docFiles.map(f => (
                      <div key={f.path} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '6px 10px', background: 'var(--cream)', borderRadius: 'var(--r-sm)' }}>
                        <a href={getDocUrl(f.path)} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 13, color: 'var(--rose)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name.replace(/^\d+_/, '')}</a>
                        <button onClick={() => deleteDocFile(f.path, c.id)} style={{ fontSize: 12, color: '#c45a5a', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '2px 6px' }}>×</button>
                      </div>
                    ))}
                    <button onClick={() => pickFile(file => uploadDocFile(c.id, file))} disabled={uploadingDoc} style={{ marginTop: 4, padding: '8px 16px', borderRadius: 'var(--r-sm)', border: '1.5px dashed rgba(28,24,20,.2)', background: '#fff', color: 'var(--mid)', fontSize: 13, cursor: uploadingDoc ? 'default' : 'pointer', width: '100%', textAlign: 'center' }}>
                      {uploadingDoc ? 'Hochladen…' : '⬆ Datei hochladen'}
                    </button>
                  </div>
                )}

                {panelOpen && clientTab === 'einsaetze' && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(28,24,20,.08)' }}>
                    {clientActivities.length === 0
                      ? <div style={{ color: 'var(--mid)', fontSize: 14 }}>Keine offenen Einsätze zur Abrechnung.</div>
                      : (
                        <>
                          <div style={{ fontSize: 12, color: 'var(--mid)', marginBottom: 10 }}>Einsätze auswählen und als abgerechnet markieren.</div>
                          {clientActivities.map(a => (
                            <div key={a.id} onClick={() => toggleSelect(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--r-sm)', marginBottom: 6, cursor: 'pointer', background: selectedIds.has(a.id) ? 'rgba(180,60,60,.07)' : 'var(--cream)', border: selectedIds.has(a.id) ? '1.5px solid var(--rose)' : '1.5px solid transparent' }}>
                              <span style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${selectedIds.has(a.id) ? 'var(--rose)' : '#ccc'}`, background: selectedIds.has(a.id) ? 'var(--rose)' : '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {selectedIds.has(a.id) && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                              </span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--dark)' }}>{new Date(a.datum + 'T00:00:00').toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })} · {hm(a.zeit_von)}–{hm(a.zeit_bis)}</div>
                                <div style={{ fontSize: 13, color: 'var(--mid)' }}>{a.caregiver?.name || '–'}</div>
                              </div>
                            </div>
                          ))}
                          <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                            <button onClick={() => setSelectedIds(new Set(clientActivities.map(a => a.id)))} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', fontSize: 13, cursor: 'pointer' }}>Alle auswählen</button>
                            <button onClick={markAbgerechnet} disabled={selectedIds.size === 0 || abrechnung} style={{ padding: '8px 20px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: selectedIds.size === 0 || abrechnung ? 0.5 : 1 }}>
                              {abrechnung ? 'Wird gespeichert…' : `${selectedIds.size > 0 ? selectedIds.size + ' ' : ''}Abgerechnet`}
                            </button>
                          </div>
                        </>
                      )}
                    {billedActivities.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div onClick={() => setShowBilled(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 0' }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--sage)', flexShrink: 0 }} />
                          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--dark)' }}>Abgerechnet ({billedActivities.length})</span>
                          <span style={{ color: 'var(--mid)', fontSize: 12, marginLeft: 'auto' }}>{showBilled ? '▲' : '▼'}</span>
                        </div>
                        {showBilled && billedActivities.map(a => (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--r-sm)', marginBottom: 4, background: 'var(--cream)', opacity: 0.7 }}>
                            <span style={{ fontSize: 13, color: 'var(--sage)', flexShrink: 0 }}>✓</span>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--dark)' }}>{new Date(a.datum + 'T00:00:00').toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })} · {hm(a.zeit_von)}–{hm(a.zeit_bis)}</div>
                              <div style={{ fontSize: 13, color: 'var(--mid)' }}>{a.caregiver?.name || '–'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

        {/* Archiv */}
        {archived.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <button onClick={() => setShowArchive(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 16, color: 'var(--mid)' }}>Archiv ({archived.length})</span>
              <span style={{ color: 'var(--mid)', fontSize: 12 }}>{showArchive ? '▲' : '▼'}</span>
            </button>
            {showArchive && archived.map(c => (
              <div key={c.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '12px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)', opacity: 0.6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{c.name}</div>
                  {c.city && <div style={{ fontSize: 13, color: 'var(--mid)' }}>{c.city}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => restore(c.id)} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', fontSize: 13, cursor: 'pointer' }}>Wiederherstellen</button>
                  <button onClick={() => permanentDelete(c.id, c.name)} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(196,90,90,.3)', background: '#fff', color: '#c45a5a', fontSize: 13, cursor: 'pointer' }}>Endgültig löschen</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
