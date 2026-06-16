import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

type LiveInClient = { id: string; name: string; street: string | null; city: string | null; notes: string | null }
type LiveInCaregiver = { id: string; name: string }
type Shift = {
  id: string
  client_id: string
  caregiver_id: string | null
  start_date: string
  end_date: string | null
  notiz: string | null
  caregiver: { name: string } | null
  client: { name: string } | null
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function diffDays(from: string, to: string) {
  return Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000)
}

export default function AdminLiveIn() {
  const router = useRouter()
  const [tab, setTab] = useState<'planung' | 'klienten' | 'betreuer'>('planung')
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<LiveInClient[]>([])
  const [caregivers, setCaregivers] = useState<LiveInCaregiver[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])

  // Shift form
  const [showShiftForm, setShowShiftForm] = useState(false)
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const [shiftForm, setShiftForm] = useState({ client_id: '', caregiver_id: '', start_date: todayStr(), end_date: '', notiz: '' })
  const [savingShift, setSavingShift] = useState(false)

  // Client form
  const [showClientForm, setShowClientForm] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [clientForm, setClientForm] = useState({ name: '', street: '', city: '', notes: '' })
  const [savingClient, setSavingClient] = useState(false)

  // Caregiver form
  const [showCaregiverForm, setShowCaregiverForm] = useState(false)
  const [editingCaregiverId, setEditingCaregiverId] = useState<string | null>(null)
  const [caregiverForm, setCaregiverForm] = useState({ name: '' })
  const [savingCaregiver, setSavingCaregiver] = useState(false)

  async function load() {
    const [{ data: cls }, { data: cgs }, { data: sh }] = await Promise.all([
      getSupabase().from('clients').select('id,name,street,city,notes').eq('live_in', true).order('name'),
      getSupabase().from('caregivers').select('id,name').eq('live_in', true).order('name'),
      getSupabase().from('live_in_shifts').select('id,client_id,caregiver_id,start_date,end_date,notiz,caregiver:caregivers(name),client:clients(name)').order('start_date', { ascending: false }),
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

  // Current assignment per client
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
    const payload = {
      client_id: shiftForm.client_id,
      caregiver_id: shiftForm.caregiver_id || null,
      start_date: shiftForm.start_date,
      end_date: shiftForm.end_date || null,
      notiz: shiftForm.notiz || null,
    }
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
    await load()
  }

  async function saveClient() {
    if (!clientForm.name) return
    setSavingClient(true)
    const payload = { name: clientForm.name, street: clientForm.street || null, city: clientForm.city || null, notes: clientForm.notes || null, live_in: true }
    if (editingClientId) {
      await getSupabase().from('clients').update(payload).eq('id', editingClientId)
    } else {
      await getSupabase().from('clients').insert(payload)
    }
    setShowClientForm(false)
    setEditingClientId(null)
    setClientForm({ name: '', street: '', city: '', notes: '' })
    setSavingClient(false)
    await load()
  }

  async function saveCaregiver() {
    if (!caregiverForm.name) return
    setSavingCaregiver(true)
    const payload = { name: caregiverForm.name, live_in: true }
    if (editingCaregiverId) {
      await getSupabase().from('caregivers').update(payload).eq('id', editingCaregiverId)
    } else {
      await getSupabase().from('caregivers').insert(payload)
    }
    setShowCaregiverForm(false)
    setEditingCaregiverId(null)
    setCaregiverForm({ name: '' })
    setSavingCaregiver(false)
    await load()
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  const inputStyle = { padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff', width: '100%', boxSizing: 'border-box' as const }
  const btnPrimary = { padding: '10px 24px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, cursor: 'pointer', fontSize: 14 }
  const btnSecondary = { padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer', fontSize: 14 }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, minWidth: 0 }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 }}>←</button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0 }}>24h-Betreuung</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(28,24,20,.1)', marginBottom: 20 }}>
          {(['planung', 'klienten', 'betreuer'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 20px', border: 'none', background: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: tab === t ? 'var(--rose)' : 'var(--mid)', borderBottom: tab === t ? '2px solid var(--rose)' : '2px solid transparent', marginBottom: -1 }}>
              {t === 'planung' ? 'Planung' : t === 'klienten' ? 'Klienten' : 'Betreuer'}
            </button>
          ))}
        </div>

        {/* ── TAB: PLANUNG ── */}
        {tab === 'planung' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: 0 }}>Aktuelle Einsätze</h2>
              <button onClick={() => openShiftNew()} style={{ ...btnPrimary, padding: '8px 16px', fontSize: 13 }}>+ Neue Schicht</button>
            </div>

            {/* Shift form */}
            {showShiftForm && (
              <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '20px', marginBottom: 20, boxShadow: 'var(--shadow-md)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: '0 0 14px' }}>{editingShiftId ? 'Schicht bearbeiten' : 'Neue Schicht'}</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  <select value={shiftForm.client_id} onChange={e => setShiftForm(f => ({ ...f, client_id: e.target.value }))} style={{ ...inputStyle }}>
                    <option value="">– Klient –</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={shiftForm.caregiver_id} onChange={e => setShiftForm(f => ({ ...f, caregiver_id: e.target.value }))} style={{ ...inputStyle }}>
                    <option value="">– noch nicht zugeteilt –</option>
                    {caregivers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label style={{ fontSize: 13, color: 'var(--mid)' }}>Von
                      <input type="date" value={shiftForm.start_date} onChange={e => setShiftForm(f => ({ ...f, start_date: e.target.value }))} style={{ ...inputStyle, marginTop: 4 }} />
                    </label>
                    <label style={{ fontSize: 13, color: 'var(--mid)' }}>Bis (leer = offen)
                      <input type="date" value={shiftForm.end_date} onChange={e => setShiftForm(f => ({ ...f, end_date: e.target.value }))} style={{ ...inputStyle, marginTop: 4 }} />
                    </label>
                  </div>
                  <input placeholder="Notiz (optional)" value={shiftForm.notiz} onChange={e => setShiftForm(f => ({ ...f, notiz: e.target.value }))} style={{ ...inputStyle }} />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                    {editingShiftId && <button onClick={() => delShift(editingShiftId).then(() => setShowShiftForm(false))} style={{ padding: '10px 16px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(196,90,90,.3)', background: '#fff', color: '#c45a5a', cursor: 'pointer', fontSize: 13 }}>Löschen</button>}
                    <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                      <button onClick={() => setShowShiftForm(false)} style={btnSecondary}>Abbrechen</button>
                      <button onClick={saveShift} disabled={savingShift || !shiftForm.client_id || !shiftForm.start_date} style={{ ...btnPrimary, opacity: savingShift ? 0.6 : 1 }}>{savingShift ? 'Speichern…' : 'Speichern'}</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Per-client current status */}
            {clients.length === 0
              ? <div style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: 32, textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>Noch keine 24h-Klienten angelegt.<br />Zuerst im Tab „Klienten" Klienten hinzufügen.</div>
              : clients.map(c => {
                const cur = currentShift(c.id)
                const pastShifts = shifts.filter(s => s.client_id === c.id && s.end_date && s.end_date < today).slice(0, 3)
                const daysLeft = cur?.end_date ? diffDays(today, cur.end_date) : null
                const borderColor = cur?.caregiver_id ? 'var(--sage)' : 'var(--rose)'
                return (
                  <div key={c.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', marginBottom: 12, boxShadow: 'var(--shadow-sm)', overflow: 'hidden', borderLeft: `4px solid ${borderColor}` }}>
                    <div style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--dark)' }}>{c.name}</div>
                          {c.city && <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>{c.city}</div>}
                        </div>
                        <button onClick={() => openShiftNew(c.id)} style={{ padding: '5px 12px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', fontSize: 12, cursor: 'pointer', flexShrink: 0, marginLeft: 10 }}>+ Schicht</button>
                      </div>

                      {cur ? (
                        <div onClick={() => openShiftEdit(cur)} style={{ marginTop: 10, padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'var(--cream)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 14 }}>
                              {cur.caregiver?.name || <span style={{ color: 'var(--rose)' }}>Kein Betreuer zugeteilt</span>}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>
                              seit {fmtDate(cur.start_date)}
                              {cur.end_date && ` bis ${fmtDate(cur.end_date)}`}
                              {daysLeft !== null && ` (noch ${daysLeft} Tag${daysLeft === 1 ? '' : 'e'})`}
                            </div>
                            {cur.notiz && <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 3, fontStyle: 'italic' }}>{cur.notiz}</div>}
                          </div>
                          <span style={{ color: 'var(--mid)', fontSize: 12 }}>✎</span>
                        </div>
                      ) : (
                        <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'rgba(180,60,60,.06)', fontSize: 14, color: 'var(--rose)', fontWeight: 500 }}>
                          Aktuell niemand zugeteilt
                        </div>
                      )}

                      {pastShifts.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          {pastShifts.map(s => (
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

        {/* ── TAB: KLIENTEN ── */}
        {tab === 'klienten' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: 0 }}>24h-Klienten</h2>
              <button onClick={() => { setEditingClientId(null); setClientForm({ name: '', street: '', city: '', notes: '' }); setShowClientForm(true) }} style={{ ...btnPrimary, padding: '8px 16px', fontSize: 13 }}>+ Neu</button>
            </div>
            {showClientForm && (
              <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 20, marginBottom: 16, boxShadow: 'var(--shadow-md)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: '0 0 14px' }}>{editingClientId ? 'Klient bearbeiten' : 'Neuer Klient'}</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input placeholder="Name *" value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} style={{ ...inputStyle }} />
                  <input placeholder="Straße" value={clientForm.street} onChange={e => setClientForm(f => ({ ...f, street: e.target.value }))} style={{ ...inputStyle }} />
                  <input placeholder="Ort" value={clientForm.city} onChange={e => setClientForm(f => ({ ...f, city: e.target.value }))} style={{ ...inputStyle }} />
                  <textarea placeholder="Notizen" value={clientForm.notes} onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowClientForm(false)} style={btnSecondary}>Abbrechen</button>
                    <button onClick={saveClient} disabled={savingClient || !clientForm.name} style={{ ...btnPrimary, opacity: savingClient || !clientForm.name ? 0.6 : 1 }}>{savingClient ? 'Speichern…' : 'Speichern'}</button>
                  </div>
                </div>
              </div>
            )}
            {clients.length === 0
              ? <div style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: 32, textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>Noch keine 24h-Klienten.</div>
              : clients.map(c => (
                <div key={c.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{c.name}</div>
                    {(c.street || c.city) && <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2 }}>{[c.street, c.city].filter(Boolean).join(', ')}</div>}
                  </div>
                  <button onClick={() => { setEditingClientId(c.id); setClientForm({ name: c.name, street: c.street || '', city: c.city || '', notes: c.notes || '' }); setShowClientForm(true) }} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', fontSize: 13, cursor: 'pointer' }}>Bearbeiten</button>
                </div>
              ))}
          </div>
        )}

        {/* ── TAB: BETREUER ── */}
        {tab === 'betreuer' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: 0 }}>24h-Betreuer</h2>
              <button onClick={() => { setEditingCaregiverId(null); setCaregiverForm({ name: '' }); setShowCaregiverForm(true) }} style={{ ...btnPrimary, padding: '8px 16px', fontSize: 13 }}>+ Neu</button>
            </div>
            {showCaregiverForm && (
              <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 20, marginBottom: 16, boxShadow: 'var(--shadow-md)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 18, color: 'var(--dark)', margin: '0 0 14px' }}>{editingCaregiverId ? 'Betreuer bearbeiten' : 'Neuer Betreuer'}</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input placeholder="Name *" value={caregiverForm.name} onChange={e => setCaregiverForm(f => ({ ...f, name: e.target.value }))} style={{ ...inputStyle }} />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowCaregiverForm(false)} style={btnSecondary}>Abbrechen</button>
                    <button onClick={saveCaregiver} disabled={savingCaregiver || !caregiverForm.name} style={{ ...btnPrimary, opacity: savingCaregiver || !caregiverForm.name ? 0.6 : 1 }}>{savingCaregiver ? 'Speichern…' : 'Speichern'}</button>
                  </div>
                </div>
              </div>
            )}
            {caregivers.length === 0
              ? <div style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: 32, textAlign: 'center', color: 'var(--mid)', fontSize: 14 }}>Noch keine 24h-Betreuer.</div>
              : caregivers.map(c => {
                const cur = shifts.find(s => s.caregiver_id === c.id && s.start_date <= today && (!s.end_date || s.end_date >= today))
                return (
                  <div key={c.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 8, boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 15 }}>{c.name}</div>
                      <div style={{ fontSize: 13, color: cur ? 'var(--sage)' : 'var(--mid)', marginTop: 2 }}>
                        {cur ? `Aktuell bei: ${cur.client?.name || '–'} (bis ${cur.end_date ? fmtDate(cur.end_date) : 'offen'})` : 'Aktuell frei'}
                      </div>
                    </div>
                    <button onClick={() => { setEditingCaregiverId(c.id); setCaregiverForm({ name: c.name }); setShowCaregiverForm(true) }} style={{ padding: '6px 14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', fontSize: 13, cursor: 'pointer' }}>Bearbeiten</button>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
