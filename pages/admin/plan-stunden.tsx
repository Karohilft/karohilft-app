import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'
import TimeSelect from '../../components/TimeSelect'
import { hm } from '../../lib/time'

function startOfWeek(d: Date) {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const r = new Date(d); r.setDate(d.getDate() + diff); r.setHours(0,0,0,0); return r
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function toISO(d: Date) { return d.toISOString().slice(0,10) }
const DAYS_DE = ['Mo','Di','Mi','Do','Fr','Sa','So']
const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const CAL_COLORS = ['#f5a7b8','#a8d5ba','#a8c4e8','#f5d0a8','#c8a8e8','#a8e8d5','#e8c8a8']
function nameColor(name: string) { let h = 0; for (let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))&0xffff; return CAL_COLORS[h%CAL_COLORS.length] }

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
  caregiver_name: string | null
  client_name: string | null
  notiz: string | null
  caregiver_no_show: boolean | null
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
      .select('id,datum,zeit_von,zeit_bis,unterschrift,caregiver_id,client_id,caregiver_name,client_name,notiz,caregiver_no_show,caregiver:caregivers(name),client:clients(name)')
      .order('datum', { ascending: false })
    setEntries((d as any) || [])
    setLoading(false)
  }

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const [{ data: cgs }, { data: cls }] = await Promise.all([
        getSupabase().from('caregivers').select('id,name').neq('role', 'admin').order('name'),
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
    const cgName = caregiverOptions.find(o => o.id === newForm.caregiver_id)?.name || ''
    const clName = clientOptions.find(o => o.id === newForm.client_id)?.name || ''
    fetch('/api/push/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caregiver_id: newForm.caregiver_id,
        title: 'Neuer Einsatz eingetragen',
        body: `${newForm.datum} · ${newForm.zeit_von}–${newForm.zeit_bis} bei ${clName}`,
        url: '/betreuer/plan',
      }),
    }).catch(() => {})
    setNewForm({ caregiver_id: '', client_id: '', datum: '', zeit_von: '', zeit_bis: '' })
    setShowNew(false)
    setSaving(false)
    await load()
  }

  const caregiverNames = [...new Set(entries.map(e => (e.caregiver as any)?.name || e.caregiver_name).filter(Boolean))].sort()
  const clientNames = [...new Set(entries.map(e => (e.client as any)?.name || e.client_name).filter(Boolean))].sort()
  const months = [...new Set(entries.map(e => e.datum?.substring(0, 7)).filter(Boolean))].sort().reverse()

  const filtered = entries.filter(e => {
    if (filterCaregiver && ((e.caregiver as any)?.name || e.caregiver_name) !== filterCaregiver) return false
    if (filterClient && ((e.client as any)?.name || e.client_name) !== filterClient) return false
    if (filterMonth && !e.datum?.startsWith(filterMonth)) return false
    return true
  })

  const totalHours = filtered.reduce((s, e) => s + calcHours(e.zeit_von, e.zeit_bis), 0)

  const [view, setView] = useState<'list'|'week'|'month'>('list')
  const [anchor, setAnchor] = useState<Date>(() => new Date())

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  function toggleGroup(name: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  const groups: { name: string; items: Activity[]; hours: number }[] = []
  for (const e of filtered) {
    const name = (e.caregiver as any)?.name || e.caregiver_name || '–'
    let g = groups.find(g => g.name === name)
    if (!g) { g = { name, items: [], hours: 0 }; groups.push(g) }
    g.items.push(e)
    g.hours += calcHours(e.zeit_von, e.zeit_bis)
  }
  groups.sort((a, b) => a.name.localeCompare(b.name))

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
            <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 22, cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 1 }}>←</button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Tätigkeitsnachweise</h1>
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

        {/* View toggle */}
        <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['list','week','month'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '6px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)', background: view===v ? 'var(--rose)' : 'rgba(28,24,20,.08)', color: view===v ? '#fff' : 'var(--dark)', fontWeight: view===v ? 600 : 400 }}>
              {v==='list' ? 'Liste' : v==='week' ? 'Woche' : 'Monat'}
            </button>
          ))}
        </div>

        {/* Week view */}
        {view === 'week' && (() => {
          const ws = startOfWeek(anchor)
          const days = Array.from({length:7}, (_,i) => addDays(ws,i))
          const label = `${ws.getDate()}. ${MONTHS_DE[ws.getMonth()]} – ${addDays(ws,6).getDate()}. ${MONTHS_DE[addDays(ws,6).getMonth()]} ${addDays(ws,6).getFullYear()}`
          const today = toISO(new Date())
          return (
            <div className="no-print">
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <button onClick={() => setAnchor(a => addDays(a,-7))} style={{ background:'transparent', border:'none', color:'var(--rose)', fontSize:22, cursor:'pointer', padding:'4px 8px' }}>‹</button>
                <span style={{ flex:1, textAlign:'center', fontSize:14, color:'var(--dark)', fontWeight:500 }}>{label}</span>
                <button onClick={() => setAnchor(a => addDays(a,7))} style={{ background:'transparent', border:'none', color:'var(--rose)', fontSize:22, cursor:'pointer', padding:'4px 8px' }}>›</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:5 }}>
                {days.map((day,i) => {
                  const iso = toISO(day)
                  const dayEntries = filtered.filter(e => e.datum === iso)
                  const isToday = iso === today
                  return (
                    <div key={iso} style={{ background:'#fff', borderRadius:'var(--r-md)', padding:'8px 6px', minHeight:90, boxShadow:'var(--shadow-sm)', border: isToday ? '2px solid var(--rose)' : '2px solid transparent' }}>
                      <div style={{ fontSize:11, fontWeight:600, color: isToday ? 'var(--rose)' : 'var(--mid)', textAlign:'center', marginBottom:5 }}>
                        {DAYS_DE[i]}<br/><span style={{ fontSize:13, color: isToday ? 'var(--rose)' : 'var(--dark)' }}>{day.getDate()}</span>
                      </div>
                      {dayEntries.map(e => {
                        const cgName = (e.caregiver as any)?.name || e.caregiver_name || '–'
                        return (
                          <div key={e.id} style={{ background: nameColor(cgName), borderRadius:5, padding:'3px 5px', fontSize:11, marginBottom:3, lineHeight:1.3 }}>
                            <div style={{ fontWeight:600, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{cgName}</div>
                            <div style={{ opacity:.75, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{hm(e.zeit_von)}–{hm(e.zeit_bis)}</div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Month view */}
        {view === 'month' && (() => {
          const ms = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
          const label = `${MONTHS_DE[ms.getMonth()]} ${ms.getFullYear()}`
          const firstWd = (ms.getDay() + 6) % 7
          const daysInMonth = new Date(ms.getFullYear(), ms.getMonth()+1, 0).getDate()
          const today = toISO(new Date())
          return (
            <div className="no-print">
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <button onClick={() => setAnchor(a => new Date(a.getFullYear(), a.getMonth()-1, 1))} style={{ background:'transparent', border:'none', color:'var(--rose)', fontSize:22, cursor:'pointer', padding:'4px 8px' }}>‹</button>
                <span style={{ flex:1, textAlign:'center', fontSize:14, color:'var(--dark)', fontWeight:500 }}>{label}</span>
                <button onClick={() => setAnchor(a => new Date(a.getFullYear(), a.getMonth()+1, 1))} style={{ background:'transparent', border:'none', color:'var(--rose)', fontSize:22, cursor:'pointer', padding:'4px 8px' }}>›</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:3 }}>
                {DAYS_DE.map(d => <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:600, color:'var(--mid)', padding:'3px 0' }}>{d}</div>)}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
                {Array.from({length:firstWd}).map((_,i) => <div key={'p'+i} />)}
                {Array.from({length:daysInMonth}).map((_,i) => {
                  const day = i+1
                  const iso = `${ms.getFullYear()}-${String(ms.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                  const dayEntries = filtered.filter(e => e.datum === iso)
                  const isToday = iso === today
                  return (
                    <div key={iso} style={{ background:'#fff', borderRadius:'var(--r-sm)', padding:'5px 5px 6px', minHeight:52, boxShadow:'var(--shadow-sm)', border: isToday ? '2px solid var(--rose)' : '2px solid transparent' }}>
                      <div style={{ fontSize:11, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--rose)' : 'var(--dark)', textAlign:'right', marginBottom:3 }}>{day}</div>
                      {dayEntries.slice(0,3).map(e => {
                        const cgName = (e.caregiver as any)?.name || e.caregiver_name || '–'
                        return <div key={e.id} style={{ height:5, borderRadius:3, background: nameColor(cgName), marginBottom:2 }} title={`${cgName} · ${hm(e.zeit_von)}–${hm(e.zeit_bis)}`} />
                      })}
                      {dayEntries.length > 3 && <div style={{ fontSize:9, color:'var(--mid)', textAlign:'center' }}>+{dayEntries.length-3}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {filtered.length === 0 && view === 'list'
          ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 40, textAlign: 'center', color: 'var(--mid)' }}>Keine Einträge gefunden.</div>
          : view === 'list' && (
            <div className="screen-only">
              {groups.map(g => {
              const open = openGroups.has(g.name)
              return (
              <div key={g.name} style={{ marginBottom: 12 }}>
                <button onClick={() => toggleGroup(g.name)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: '#fff', borderRadius: 'var(--r-md)', border: 'none', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--dark)', fontSize: 16 }}>
                    <span style={{ display: 'inline-block', transition: 'transform .15s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                    {g.name}
                    <span style={{ fontSize: 13, color: 'var(--mid)', fontWeight: 400 }}>({g.items.length})</span>
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--rose)' }}>{Math.round(g.hours * 10) / 10}h</span>
                </button>
                {open && <div style={{ marginTop: 8 }}>
              {g.items.map(e => {
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
                          {(e.caregiver as any)?.name || e.caregiver_name || '–'} → {(e.client as any)?.name || e.client_name || '–'}
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--mid)', marginTop: 3 }}>
                          {e.datum} · {hm(e.zeit_von)} – {hm(e.zeit_bis)}
                        </div>
                        {e.caregiver_no_show && (
                          <div style={{ marginTop: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#C0392B', background: 'rgba(192,57,43,.1)', padding: '3px 10px', borderRadius: 'var(--r-pill)' }}>Einsatz nicht durchgeführt</span>
                          </div>
                        )}
                        {e.notiz && <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 6, fontStyle: 'italic' }}>„{e.notiz}"</div>}
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
                </div>}
              </div>
              )})}
              <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(196,124,90,.08)', borderRadius: 'var(--r-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--dark)' }}>Gesamt{filterCaregiver || filterClient || filterMonth ? ' (gefiltert)' : ''}:</span>
                <span style={{ fontWeight: 700, fontSize: 22, color: 'var(--rose)' }}>{Math.round(totalHours * 10) / 10}h</span>
              </div>
            </div>
          )}

        {filtered.length > 0 && (
          <div className="print-only">
            {groups.map(g => (
              <div key={g.name} style={{ marginBottom: 14, breakInside: 'avoid' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 15, margin: '0 0 4px', color: 'var(--dark)' }}>{g.name}</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>
                      <th style={{ padding: '3px 6px' }}>Datum</th>
                      <th style={{ padding: '3px 6px' }}>Zeit</th>
                      <th style={{ padding: '3px 6px' }}>Klient</th>
                      <th style={{ padding: '3px 6px', textAlign: 'right' }}>Stunden</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '3px 6px' }}>{e.datum}</td>
                        <td style={{ padding: '3px 6px' }}>{hm(e.zeit_von)}–{hm(e.zeit_bis)}</td>
                        <td style={{ padding: '3px 6px' }}>{(e.client as any)?.name || e.client_name || '–'}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'right' }}>{calcHours(e.zeit_von, e.zeit_bis)}h</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3} style={{ padding: '4px 6px', fontWeight: 600, textAlign: 'right' }}>Summe</td>
                      <td style={{ padding: '4px 6px', fontWeight: 600, textAlign: 'right' }}>{Math.round(g.hours * 10) / 10}h</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, borderTop: '2px solid #999', paddingTop: 6 }}>
              <span>Gesamt{filterCaregiver || filterClient || filterMonth ? ' (gefiltert)' : ''}:</span>
              <span>{Math.round(totalHours * 10) / 10}h</span>
            </div>
          </div>
        )}

        <style>{`
          .print-only { display: none; }
          @media print {
            .no-print { display: none !important; }
            .screen-only { display: none !important; }
            .print-only { display: block !important; }
          }
        `}</style>
      </div>
    </div>
  )
}
