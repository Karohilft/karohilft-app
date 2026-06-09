import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

type Assignment = { id: string; date_from: string; date_to: string; hours: number; caregivers: { name: string } | null; clients: { name: string } | null }

export default function PlanStunden() {
  const router = useRouter()
  const [data, setData] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: s }) => {
      if (!s.session) { router.replace('/login'); return }
      getSupabase().from('assignments_hours').select('*, caregivers(name), clients(name)').order('date_from', { ascending: false }).then(({ data }) => {
        setData((data as Assignment[]) || [])
        setLoading(false)
      })
    })
  }, [router])

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--rose)', fontSize: 24, cursor: 'pointer', padding: 0 }}>←</button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0 }}>Stundenplan</h1>
        </div>
        {data.length === 0
          ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 32, textAlign: 'center', color: 'var(--mid)' }}>Noch keine Einträge.</div>
          : data.map(d => (
            <div key={d.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '16px 20px', marginBottom: 10, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontWeight: 600, color: 'var(--dark)' }}>{d.caregivers?.name} → {d.clients?.name}</div>
              <div style={{ fontSize: 14, color: 'var(--mid)', marginTop: 4 }}>{d.date_from} – {d.date_to} · {d.hours}h</div>
            </div>
          ))}
      </div>
    </div>
  )
}
