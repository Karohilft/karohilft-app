import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

type LiveInClient = {
  id: string; name: string; street: string | null; city: string | null
  notes: string | null; haustier: boolean; haustier_details: string | null; raucher: boolean; zweite_person: boolean
}
type LiveInCaregiver = {
  id: string; name: string; street: string | null; city: string | null
  notes: string | null; sprache: string | null; fuehrerschein: boolean; raucher: boolean
}
type Shift = {
  id: string; client_id: string; caregiver_id: string | null
  start_date: string; end_date: string | null; notiz: string | null; abgerechnet: boolean
  caregiver: { name: string } | null; client: { name: string } | null
}

function todayStr() { return new Date().toISOString().slice(0, 10) }
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function diffDays(from: string, to: string) {
  return Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000)
}

const BUCKET = 'live-in-docs'

function pickFile(onFile: (f: File) => void) {
  const input = document.createElement('input')
  input.type = 'file'
  input.onchange = () => { if (input.files?.[0]) onFile(input.files[0]) }
  input.click()
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        padding: '10px 16px', borderRadius: 'var(--r-sm)', fontSize: 14,
        border: checked ? '1.5px solid var(--rose)' : '1.5px solid rgba(28,24,20,.15)',
        background: checked ? 'rgba(180,60,60,.07)' : '#fff',
        color: checked ? 'var(--rose)' : 'var(--mid)',
        fontWeight: checked ? 600 : 400, transition: 'all .15s',
        userSelect: 'none', flexShrink: 0,
      }}
    >
      <span style={{
        width: 36, height: 20, borderRadius: 10, flexShrink: 0,
        background: checked ? 'var(--rose)' : 'rgba(28,24,20,.15)',
        position: 'relative', transition: 'background .15s', display: 'inline-block',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: checked ? 19 : 3,
          width: 14, height: 14, borderRadius: '50%', background: '#fff',
          transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }} />
      </span>
      {label}
    </button>
  )
}

export default function AdminLiveIn() {
  const router = useRouter()
  const [tab, setTab] = useState<'planung' | 'einsaetze' | 'klienten' | 'betreuer'>('planung')
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<LiveInClient[]>([])
  const [caregivers, setCaregivers] = useState<LiveInCaregiver[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])

  // Shift form
  const [showShiftForm, setShowShiftForm] = useState(false)
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const [shiftForm, setShiftForm] = useState({ client_id: '', caregiver_id: '', start_date: todayStr(), end_date: '', notiz: '' })
  const [savingShift, setSavingShift] = useState(false)

  // Client
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null)
  const [clientForm, setClientForm] = useState({ name: '', street: '', city: '', notes: '', haustier: false, haustier_details: '', raucher: false, zweite_person: false })
  const [savingClient, setSavingClient] = useState(false)
  const [clientFiles, setClientFiles] = useState<{ name: string; path: string }[]>([])
  const [uploadingClient, setUploadingClient] = useState(false)

  // Caregiver
  const [showNewCaregiverForm, setShowNewCaregiverForm] = useState(false)
  const [expandedCaregiverId, setExpandedCaregiverId] = useState<string | null>(null)
  const [caregiverForm, setCaregiverForm] = useState({ name: '', street: '', city: '', notes: '', sprache: '', fuehrerschein: false, raucher: false })
  const [savingCaregiver, setSavingCaregiver] = useState(false)
  const [caregiverFiles, setCaregiverFiles] = useState<{ name: string; path: string }[]>([])
  const [uploadingCaregiver, setUploadingCaregiver] = useState(false)

  // Einsätze billing
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set())
  const [showBilled, setShowBilled] = useState(false)
  const [billingClientFilter, setBillingClientFilter] = useState('all')

  async function load() {
    const [{ data: cls }, { data: cgs }, { data: sh }] = await Promise.all([
      getSupabase().from('clients').select('id,name,street,city,notes,haustier,haustier_details,raucher,zweite_person').eq('live_in', true).order('name'),
      getSupabase().from('caregivers').select('id,name,street,city,notes,sprache,fuehrerschein,raucher').eq('live_in', true).order('name'),
      getSupabase().from('live_in_shifts').select('id,client_id,caregiver_id,start_date,end_date,notiz,abgerechnet,caregiver:caregivers(name),client:clients(name)').order('start_date', { ascending: false }),
    ])
    setClients((cls as any) || [])
    setCaregivers((cgs as any) || [])
    setShifts((sh as any) || [])
    setLoading(false)
  }

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      load()
    })
  }, [router])

  const today = todayStr()

  function currentShift(clientId: string) {
    return shifts.find(s => s.client_id === clientId && s.start_date <= today && (!s.end_date || s.end_date >= today))
  }

  function openShiftNew(clientId = '') {
    setEditingShiftId(null)
    setShiftForm({ client_id: clientId, caregiver_id: '', start_date: todayStr(), end_date: '', notiz: '' })
    setShowShiftForm(true)
  }

  function openShiftEdit(s: Shift) {
    setEditingShiftId(s.id)
    setShiftForm({ client_id: s.client_id, caregiver_id: s.caregiver_id || '', start_date: s.start_date, end_date: s.end_date || '', notiz: s.notiz || '' })
    setShowShiftForm(true)
  }

  async function saveShift() {
    if (!shiftForm.client_id || !shiftForm.start_date) return
    setSavingShift(true)
    const payload = { client_id: shiftForm.client_id, caregiver_id: shiftForm.caregiver_id || null, start_date: shiftForm.start_date, end_date: shiftForm.end_date || null, notiz: shiftForm.notiz || null }
    if (editingShiftId) {
      await getSupabase().from('live_in_shifts').update(payload).eq('id', editingShiftId)
    } else {
      await getSupabase().from('live_in_shifts').insert(payload)
    }
    setShowShiftForm(false)
    setSavingShift(false)
    await load()
  }

  async function delShift(id: string) {
    if (!confirm('Schicht löschen?')) return
    await getSupabase().from('live_in_shifts').delete().eq('id', id)
    setShowShiftForm(false)
    await load()
  }

  async function loadEntityFiles(folder: string, entityId: string) {
    const { data } = await getSupabase().storage.from(BUCKET).list(`${folder}/${entityId}`)
    return (data || []).map(f => ({ name: f.name, path: `${folder}/${entityId}/${f.name}` }))
  }

  async function openClientExpand(c: LiveInClient) {
    if (expandedClientId === c.id) { setExpandedClientId(null); return }
    setClientForm({ name: c.name, street: c.street || '', city: c.city || '', notes: c.notes || '', haustier: c.haustier, haustier_details: c.haustier_details || '', raucher: c.raucher, zweite_person: c.zweite_person })
    setExpandedClientId(c.id)
    setShowNewClientForm(false)
    setClientFiles(await loadEntityFiles('clients', c.id))
  }

  async function openCaregiverExpand(c: LiveInCaregiver) {
    if (expandedCaregiverId === c.id) { setExpandedCaregiverId(null); return }
    setCaregiverForm({ name: c.name, street: c.street || '', city: c.city || '', notes: c.notes || '', sprache: c.sprache || '', fuehrerschein: c.fuehrerschein, raucher: c.raucher })
    setExpandedCaregiverId(c.id)
    setShowNewCaregiverForm(false)
    setCaregiverFiles(await loadEntityFiles('caregivers', c.id))
  }

  async function saveClient(editingId: string | null) {
    if (!clientForm.name) return
    setSavingClient(true)
    const payload = { name: clientForm.name, street: clientForm.street || null, city: clientForm.city || null, notes: clientForm.notes || null, haustier: clientForm.haustier, haustier_details: clientForm.haustier_details || null, raucher: clientForm.raucher, zweite_person: clientForm.zweite_person, live_in: true }
    if (editingId) {
      await getSupabase().from('clients').update(payload).eq('id', editingId)
    } else {
      await getSupabase().from('clients').insert(payload)
    }
    setExpandedClientId(null)
    setShowNewClientForm(false)
    setClientForm({ name: '', street: '', city: '', notes: '', haustier: false, haustier_details: '', raucher: false, zweite_person: false })
    setSavingClient(false)
    await load()
  }

  async function uploadClientFile(clientId: string, file: File) {
    setUploadingClient(true)
    const path = `clients/${clientId}/${Date.now()}_${file.name}`
    const { error } = await getSupabase().storage.from(BUCKET).upload(path, file)
    if (error) alert('Upload fehlgeschlagen: ' + error.message)
    else setClientFiles(await loadEntityFiles('clients', clientId))
    setUploadingClient(false)
  }

  async function deleteClientFile(path: string, clientId: string) {
    if (!confirm('Datei löschen?')) return
    await getSupabase().storage.from(BUCKET).remove([path])
    setClientFiles(await loadEntityFiles('clients', clientId))
  }

  async function saveCaregiver(editingId: string | null) {
    if (!caregiverForm.name) return
    setSavingCaregiver(true)
    const payload = { name: caregiverForm.name, street: caregiverForm.street || null, city: caregiverForm.city || null, notes: caregiverForm.notes || null, sprache: caregiverForm.sprache || null, fuehrerschein: caregiverForm.fuehrerschein, raucher: caregiverForm.raucher, live_in: true }
    if (editingId) {
      await getSupabase().from('caregivers').update(payload).eq('id', editingId)
    } else {
      await getSupabase().from('caregivers').insert(payload)
    }
    setExpandedCaregiverId(null)
    setShowNewCaregiverForm(false)
    setCaregiverForm({ name: '', street: '', city: '', notes: '', sprache: '', fuehrerschein: false, raucher: false })
    setSavingCaregiver(false)
    await load()
  }

  async function uploadCaregiverFile(caregiverId: string, file: File) {
    setUploadingCaregiver(true)
    const path = `caregivers/${caregiverId}/${Date.now()}_${file.name}`
    const { error } = await getSupabase().storage.from(BUCKET).upload(path, file)
    if (error) alert('Upload fehlgeschlagen: ' + error.message)
    else setCaregiverFiles(await loadEntityFiles('caregivers', caregiverId))
    setUploadingCaregiver(false)
  }

  async function deleteCaregiverFile(path: string, caregiverId: string) {
    if (!confirm('Datei löschen?')) return
    await getSupabase().storage.from(BUCKET).remove([path])
    setCaregiverFiles(await loadEntityFiles('caregivers', caregiverId))
  }

  function getPublicUrl(path: string) {
    return getSupabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  async function markBilled() {
    const ids = Array.from(selectedShiftIds)
    if (!ids.length) return
    await getSupabase().from('live_in_shifts').update({ abgerechnet: true }).in('id', ids)
    setSelectedShiftIds(new Set())
    await load()
  }

  function toggleShiftSelect(id: string) {
    setSelectedShiftIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  const inp: React.CSSProperties = { padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff', width: '100%', boxSizing: 'border-box' }
  const btnP: React.CSSProperties = { padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer', fontSize: 14 }
  const btnS: React.CSSProperties = { padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer', fontSize: 14 }
  const btnSm: React.CSSProperties = { padding: '7px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', fontSize: 13, cursor: 'pointer' }

  const openShifts = shifts.filter(s => !s.abgerechnet)
  const billedShifts = shifts.filter(s => s.abgerechnet)
  const filteredOpen = billingClientFilter === 'all' ? openShifts : openShifts.filter(s => s.client_id === billingClientFilter)
  const filteredBilled = billingClientFilter === 'all' ? billedShifts : billedShifts.filter(s => s.client_id === billingClientFilter)

  function FileSection({ files, uploading, onUpload, onDelete }: { files: { name: string; path: string }[]; uploading: boolean; onUpload: (f: File) => void; onDelete: (path: string) => void }) {
    return (
      <div style={{ borderTop: '1px solid rgba(28,24,20,.08)', paddingTop: 12, marginTop: 4 }}>
        <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 8, fontWeight: 500 }}>Dokumente</div>
        {files.length === 0 && <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 8, fontStyle: 'italic' }}>Keine Dokumente hochgeladen.</div>}
        {files.map(f => (
          <div key={f.path} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '6px 10px', background: 'var(--cream)', borderRadius: 'var(--r-sm)' }}>
            <span style={{ fontSize: 16 }}>📄</span>
            <a href={getPublicUrl(f.path)} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 13, color: 'var(--rose)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name.replace(/^\d+_/, '')}</a>
            <button onClick={() => onDelete(f.path)} style={{ fontSize: 12, color: '#c45a5a', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '2px 6px' }}>✕</button>
          </div>
        ))}
        <button
          onClick={() => pickFile(onUpload)}
          disabled={uploading}
          style={{ marginTop: 4, padding: '8px 16px', borderRadius: 'var(--r-sm)', border: '1.5px dashed rgba(28,24,20,.2)', background: '#fff', color: 'var(--mid)', fontSize: 13, cursor: uploading ? 'default' : 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <span style={{ fontSize: 16 }}>⬆</span>{uploading ? 'Hochladen…' : 'Datei hochladen'}
        </button>
      </div>
    )
  }

  function clientFormFields(editingId: string | null) {
    return (
      <>
        <input placeholder="Name *" value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} style={inp} />
        <input placeholder="Straße" value={clientForm.street} onChange={e => setClientForm(f => ({ ...f, street: e.target.value }))} style={inp} />
        <input placeholder="Ort" value={clientForm.city} onChange={e => setClientForm(f => ({ ...f, city: e.target.value }))} style={inp} />
        <textarea placeholder="Notizen" value={clientForm.notes} onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inp, resize: 'vertical' }} />
        <div>
          <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 8 }}>Eigenschaften</div>
          <Toggle label="Haustier vorhanden" checked={clientForm.haustier} onChange={v => setClientForm(f => ({ ...f, haustier: v }))} />
          {clientForm.haustier && (
            <input placeholder="Welches Tier? (z.B. Hund, Katze)" value={clientForm.haustier_details} onChange={e => setClientForm(f => ({ ...f, haustier_details: e.target.value }))} style={{ ...inp, marginTop: 6, marginBottom: 4 }} />
          )}
          <Toggle label="Raucher" checked={clientForm.raucher} onChange={v => setClientForm(f => ({ ...f, raucher: v }))} />
          <Toggle label="Zweite Person im Haushalt" checked={clientForm.zweite_person} onChange={v => setClientForm(f => ({ ...f, zweite_person: v }))} />
        </div>
        {editingId && (
          <FileSection
            files={clientFiles}
            uploading={uploadingClient}
            onUpload={file => uploadClientFile(editingId, file)}
            onDelete={path => deleteClientFile(path, editingId)}
          />
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={() => { setShowNewClientForm(false); setExpandedClientId(null); setClientForm({ name: '', street: '', city: '', notes: '', haustier: false, haustier_details: '', raucher: false, zweite_person: false }) }} style={btnS}>Abbrechen</button>
          <button onClick={() => saveClient(editingId)} disabled={savingClient || !clientForm.name} style={{ ...btnP, opacity: savingClient || !clientForm.name ? 0.6 : 1 }}>{savingClient ? 'Speichern…' : 'Speichern'}</button>
        </div>
      </>
    )
  }

  function caregiverFormFields(editingId: string | null) {
    return (
      <>
        <input placeholder="Name *" value={caregiverForm.name} onChange={e => setCaregiverForm(f => ({ ...f, name: e.target.value }))} style={inp} />
        <input placeholder="Straße" value={caregiverForm.street} onChange={e => setCaregiverForm(f => ({ ...f, street: e.target.value }))} style={inp} />
        <input placeholder="Ort" value={caregiverForm.city} onChange={e => setCaregiverForm(f => ({ ...f, city: e.target.value }))} style={inp} />
        <input placeholder="Sprache(n)" value={caregiverForm.sprache} onChange={e => setCaregiverForm(f => ({ ...f, sprache: e.target.value }))} style={inp} />
        <textarea placeholder="Notizen" value={caregiverForm.notes} onChange={e => setCaregiverForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inp, resize: 'vertical' }} />
        <div>
          <div style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 8 }}>Eigenschaften</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Toggle label="Führerschein" checked={caregiverForm.fuehrerschein} onChange={v => setCaregiverForm(f => ({ ...f, fuehrerschein: v }))} />
            <Toggle label="Raucher" checked={caregiverForm.raucher} onChange={v => setCaregiverForm(f => ({ ...f, raucher: v }))} />
          </div>
        </div>
        {editingId && (
          <FileSection
            files={caregiverFiles}
            uploading={uploadingCaregiver}
            onUpload={file => uploadCaregiverFile(editingId, file)}
            onDelete={path => deleteCaregiverFile(path, editingId)}
          />
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={() => { setShowNewCaregiverForm(false); setExpandedCaregiverId(null); setCaregiverForm({ name: '', street: '', city: '', notes: '', sprache: '', fuehrerschein: false, raucher: false }) }} style={btnS}>Abbrechen</button>
          <button onClick={() => saveCaregiver(editingId)} disabled={savingCaregiver || !caregiverForm.name} style={{ ...btnP, opacity: savingCaregiver || !caregiverForm.name ? 0.6 : 1 }}>{savingCaregiver ? 'Speichern…' : 'Speichern'}</button>
        </div>
      </>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <style>{`@media print { .livein-no-print { display: none !important; } .livein-print-header { display: block !important; } body { background: white; } }`}</style>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <div className="livein-no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>←</button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0 }}>24h-Betreuung</h1>
        </div>

        <div className="livein-no-print" style={{ display: 'flex', borderBottom: '1px solid rgba(28,24,20,.1)', marginBottom: 20, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' } as any}>
          {(['planung', 'einsaetze', 'klienten', 'betreuer'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 18px', border: 'none', background: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', color: tab === t ? 'var(--rose)' : 'var(--mid)', borderBottom: tab === t ? '2px solid var(--rose)' : '2px solid transparent', marginBottom: -1 }}>
              {t === 'planung' ? 'Planung' : t === 'einsaetze' ? 'Einsätze' : t === 'klienten' ? 'Klienten' : 'Betreuer'}
            </button>
          ))}
        </div>

        {/* ── PLANUNG ── */}
        {tab === 'planung' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: 0 }}>Aktuelle Einsätze</h2>
              <button onClick={() => openShiftNew()} style={{ ...btnP, padding: '8px 16px', fontSize: 13 }}>+ Neue Schicht</button>
            </div>

            {showShiftForm && (
              <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 20, marginBottom: 20, boxShadow: 'var(--shadow-md)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: '0 0 14px' }}>{editingShiftId ? 'Schicht bearbeiten' : 'Neue Schicht'}</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  <select value={shiftForm.client_id} onChange={e => setShiftForm(f => ({ ...f, client_id: e.target.value }))} style={inp}>
                    <option value="">– Klient –</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={shiftForm.caregiver_id} onChange={e => setShiftForm(f => ({ ...f, caregiver_id: e.target.value }))} style={inp}>
                    <option value="">– noch nicht zugeteilt –</option>
                    {caregivers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label style={{ fontSize: 13, color: 'var(--mid)' }}>Von<input type="date" value={shiftForm.start_date} onChange={e => setShiftForm(f => ({ ...f, start_date: e.target.value }))} style={{ ...inp, marginTop: 4 }} /></label>
                    <label style={{ fontSize: 13, color: 'var(--mid)' }}>Bis (leer = offen)<input type="date" value={shiftForm.end_date} onChange={e => setShiftForm(f => ({ ...f, end_date: e.target.value }))} style={{ ...inp, marginTop: 4 }} /></label>
                  </div>
                  <input placeholder="Notiz (optional)" value={shiftForm.notiz} onChange={e => setShiftForm(f => ({ ...f, notiz: e.target.value }))} style={inp} />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                    {editingShiftId && <button onClick={() => delShift(editingShiftId)} style={{ padding: '10px 16px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(196,90,90,.3)', background: '#fff', color: '#c45a5a', cursor: 'pointer', fontSize: 13 }}>Löschen</button>}
                    <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                      <button onClick={() => setShowShiftForm(false)} style={btnS}>Abbrechen</button>
                      <button onClick={saveShift} disabled={savingShift || !shiftForm.client_id || !shiftForm.start_date} style={{ ...btnP, opacity: savingShift ? 0.6 : 1 }}>{savingShift ? 'Speichern…' : 'Speichern'}</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {clients.length === 0
              ? <div style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: 32, textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>Noch keine 24h-Klienten.<br />Zuerst im Tab „Klienten" anlegen.</div>
              : clients.map(c => {
                const cur = currentShift(c.id)
                const past = shifts.filter(s => s.client_id === c.id && s.end_date && s.end_date < today).slice(0, 3)
                const daysLeft = cur?.end_date ? diffDays(today, cur.end_date) : null
                return (
                  <div key={c.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', marginBottom: 12, boxShadow: 'var(--shadow-sm)', overflow: 'hidden', borderLeft: `4px solid ${cur?.caregiver_id ? 'var(--sage)' : 'var(--rose)'}` }}>
                    <div style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--dark)' }}>{c.name}</span>
                            {c.haustier && <span style={{ fontSize: 12, background: 'rgba(28,24,20,.07)', borderRadius: 'var(--r-pill)', padding: '2px 8px', color: 'var(--mid)' }}>Haustier</span>}
                          </div>
                          {c.city && <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>{c.city}</div>}
                        </div>
                        <button onClick={() => openShiftNew(c.id)} style={{ ...btnSm, flexShrink: 0, marginLeft: 10, fontSize: 12 }}>+ Schicht</button>
                      </div>
                      {cur ? (
                        <div onClick={() => openShiftEdit(cur)} style={{ marginTop: 10, padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'var(--cream)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 14 }}>{cur.caregiver?.name || <span style={{ color: 'var(--rose)' }}>Kein Betreuer zugeteilt</span>}</div>
                            <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>seit {fmtDate(cur.start_date)}{cur.end_date && ` bis ${fmtDate(cur.end_date)}`}{daysLeft !== null && ` (noch ${daysLeft} Tag${daysLeft === 1 ? '' : 'e'})`}</div>
                            {cur.notiz && <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 3, fontStyle: 'italic' }}>{cur.notiz}</div>}
                          </div>
                          <span style={{ color: 'var(--mid)', fontSize: 12 }}>✎</span>
                        </div>
                      ) : (
                        <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'rgba(180,60,60,.06)', fontSize: 14, color: 'var(--rose)', fontWeight: 500 }}>Aktuell niemand zugeteilt</div>
                      )}
                      {past.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          {past.map(s => (
                            <div key={s.id} onClick={() => openShiftEdit(s)} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 14px', borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--mid)', cursor: 'pointer', opacity: 0.7 }}>
                              <span>{s.caregiver?.name || '–'}</span>
                              <span>{fmtDate(s.start_date)}–{s.end_date ? fmtDate(s.end_date) : '…'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* ── EINSÄTZE ── */}
        {tab === 'einsaetze' && (
          <div>
            <div style={{ display: 'none' }} className="livein-print-header">
              <div style={{ fontFamily: 'serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Karohilft – 24h-Betreuung Einsätze</div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
                {billingClientFilter !== 'all' ? `Klient: ${clients.find(c => c.id === billingClientFilter)?.name}` : 'Alle Klienten'} · Druckdatum: {new Date().toLocaleDateString('de-AT')}
              </div>
            </div>
            <div className="livein-no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: 0 }}>Einsätze</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={billingClientFilter} onChange={e => { setBillingClientFilter(e.target.value); setSelectedShiftIds(new Set()) }} style={{ padding: '8px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 14, background: '#fff', cursor: 'pointer' }}>
                  <option value="all">Alle Klienten</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={() => window.print()} style={{ ...btnSm, color: 'var(--rose)', borderColor: 'rgba(180,60,60,.3)', display: 'flex', alignItems: 'center', gap: 5 }}>⎙ Drucken</button>
              </div>
            </div>
            {selectedShiftIds.size > 0 && (
              <div className="livein-no-print" style={{ background: 'rgba(180,60,60,.06)', borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--rose)', fontWeight: 500 }}>{selectedShiftIds.size} ausgewählt</span>
                <button onClick={markBilled} style={{ ...btnP, padding: '8px 18px', fontSize: 13 }}>Abgerechnet markieren</button>
              </div>
            )}
            {filteredOpen.length === 0
              ? <div style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', color: 'var(--mid)', fontSize: 14, boxShadow: 'var(--shadow-sm)', marginBottom: 8 }}>Keine offenen Einsätze.</div>
              : filteredOpen.map(s => (
                <div key={s.id} onClick={() => toggleShiftSelect(s.id)} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '12px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderLeft: `4px solid ${selectedShiftIds.has(s.id) ? 'var(--rose)' : 'rgba(28,24,20,.08)'}` }}>
                  <input type="checkbox" checked={selectedShiftIds.has(s.id)} onChange={() => toggleShiftSelect(s.id)} onClick={e => e.stopPropagation()} className="livein-no-print" style={{ width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{s.client?.name || '–'}</div>
                    <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>{s.caregiver?.name || 'Kein Betreuer'} · {fmtDate(s.start_date)}{s.end_date ? ` – ${fmtDate(s.end_date)}` : ' (offen)'}</div>
                    {s.notiz && <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2, fontStyle: 'italic' }}>{s.notiz}</div>}
                  </div>
                </div>
              ))}
            {filteredBilled.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <button onClick={() => setShowBilled(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 16, color: 'var(--mid)' }}>Abgerechnet ({filteredBilled.length})</span>
                  <span style={{ color: 'var(--mid)', fontSize: 12 }}>{showBilled ? '▲' : '▼'}</span>
                </button>
                {showBilled && filteredBilled.map(s => (
                  <div key={s.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '12px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)', opacity: 0.6, display: 'flex', alignItems: 'center', gap: 12, borderLeft: '4px solid var(--sage)' }}>
                    <span style={{ fontSize: 11, background: 'var(--sage)', color: '#fff', borderRadius: 'var(--r-pill)', padding: '2px 8px', flexShrink: 0 }}>✓</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{s.client?.name || '–'}</div>
                      <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>{s.caregiver?.name || 'Kein Betreuer'} · {fmtDate(s.start_date)}{s.end_date ? ` – ${fmtDate(s.end_date)}` : ' (offen)'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── KLIENTEN ── */}
        {tab === 'klienten' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: 0 }}>24h-Klienten</h2>
              <button onClick={() => { setExpandedClientId(null); setClientForm({ name: '', street: '', city: '', notes: '', haustier: false, haustier_details: '', raucher: false, zweite_person: false }); setClientFiles([]); setShowNewClientForm(v => !v) }} style={{ ...btnP, padding: '8px 16px', fontSize: 13 }}>+ Neu</button>
            </div>
            {showNewClientForm && (
              <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 20, marginBottom: 16, boxShadow: 'var(--shadow-md)', display: 'grid', gap: 10 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: '0 0 4px' }}>Neuer Klient</h3>
                {clientFormFields(null)}
              </div>
            )}
            {clients.length === 0
              ? <div style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: 32, textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>Noch keine 24h-Klienten.</div>
              : clients.map(c => (
                <div key={c.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', marginBottom: 8, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                  <div onClick={() => openClientExpand(c)} style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{c.name}</span>
                        {c.haustier && <span style={{ fontSize: 12, background: 'rgba(180,60,60,.1)', color: 'var(--rose)', borderRadius: 'var(--r-pill)', padding: '2px 8px' }}>Haustier</span>}
                      </div>
                      {(c.street || c.city) && <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>{[c.street, c.city].filter(Boolean).join(', ')}</div>}
                    </div>
                    <span style={{ color: 'var(--mid)', fontSize: 14 }}>{expandedClientId === c.id ? '▲' : '▼'}</span>
                  </div>
                  {expandedClientId === c.id && (
                    <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(28,24,20,.07)', display: 'grid', gap: 10, paddingTop: 14 }}>
                      {clientFormFields(c.id)}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* ── BETREUER ── */}
        {tab === 'betreuer' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: 0 }}>24h-Betreuer</h2>
              <button onClick={() => { setExpandedCaregiverId(null); setCaregiverForm({ name: '', street: '', city: '', notes: '', sprache: '', fuehrerschein: false, raucher: false }); setCaregiverFiles([]); setShowNewCaregiverForm(v => !v) }} style={{ ...btnP, padding: '8px 16px', fontSize: 13 }}>+ Neu</button>
            </div>
            {showNewCaregiverForm && (
              <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 20, marginBottom: 16, boxShadow: 'var(--shadow-md)', display: 'grid', gap: 10 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: '0 0 4px' }}>Neuer Betreuer</h3>
                {caregiverFormFields(null)}
              </div>
            )}
            {caregivers.length === 0
              ? <div style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: 32, textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>Noch keine 24h-Betreuer.</div>
              : caregivers.map(c => {
                const cur = shifts.find(s => s.caregiver_id === c.id && s.start_date <= today && (!s.end_date || s.end_date >= today))
                return (
                  <div key={c.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', marginBottom: 8, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                    <div onClick={() => openCaregiverExpand(c)} style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{c.name}</span>
                          {c.sprache && <span style={{ fontSize: 12, color: 'var(--mid)', background: 'rgba(28,24,20,.06)', borderRadius: 'var(--r-pill)', padding: '2px 8px' }}>{c.sprache}</span>}
                          {c.fuehrerschein && <span style={{ fontSize: 12, color: 'var(--mid)', background: 'rgba(28,24,20,.06)', borderRadius: 'var(--r-pill)', padding: '2px 8px' }}>Führerschein</span>}
                          {c.raucher && <span style={{ fontSize: 12, color: 'var(--mid)', background: 'rgba(28,24,20,.06)', borderRadius: 'var(--r-pill)', padding: '2px 8px' }}>Raucher</span>}
                        </div>
                        <div style={{ fontSize: 13, color: cur ? 'var(--sage)' : 'var(--mid)', marginTop: 3 }}>
                          {cur ? `Aktuell bei: ${cur.client?.name || '–'}${cur.end_date ? ` (bis ${fmtDate(cur.end_date)})` : ''}` : 'Aktuell frei'}
                        </div>
                      </div>
                      <span style={{ color: 'var(--mid)', fontSize: 14, flexShrink: 0, marginLeft: 10 }}>{expandedCaregiverId === c.id ? '▲' : '▼'}</span>
                    </div>
                    {expandedCaregiverId === c.id && (
                      <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(28,24,20,.07)', display: 'grid', gap: 10, paddingTop: 14 }}>
                        {caregiverFormFields(c.id)}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
