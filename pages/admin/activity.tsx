import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'
import { hm } from '../../lib/time'

type Activity = { id: string; name: string; datum: string; zeit_von: string; zeit_bis: string }

export default function AdminActivity() {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      getSupabase().from('activities').select('*').order('datum', { ascending: false }).then(({ data }) => {
        setActivities((data as Activity[]) || [])
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
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 26, color: 'var(--dark)', margin: 0 }}>Aktivitäten</h1>
        </div>
        {activities.length === 0
          ? <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 32, textAlign: 'center', color: 'var(--mid)' }}>Noch keine Einträge.</div>
          : activities.map(a => (
            <div key={a.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '16px 20px', marginBottom: 10, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, color: 'var(--dark)' }}>{a.name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{a.datum}</div>
              </div>
              {(a.zeit_von || a.zeit_bis) && <div style={{ fontSize: 14, color: 'var(--mid)', marginTop: 4 }}>{hm(a.zeit_von)} – {hm(a.zeit_bis)}</div>}
            </div>
          ))}
      </div>
    </div>
  )
}
