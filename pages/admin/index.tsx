import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const email = data.session.user.email
      const adminEmails = [
        'office@karohilft.at',
        ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
      ]
      const metaRole = data.session.user.user_metadata?.role
      const { data: cg } = await getSupabase().from('caregivers').select('role').eq('email', email).single()
      const isAdmin = cg?.role === 'admin' || metaRole === 'admin' || adminEmails.includes(email?.toLowerCase() ?? '')
      if (!isAdmin) { router.replace('/betreuer'); return }
      setLoading(false)
    })
  }, [router])

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--mid)' }}>Lädt…</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32, paddingTop: 24 }}>
          <img src="/karohilft-logo.png" alt="Karohilft" style={{ width: 120, marginBottom: 8 }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--dark)', margin: '0 0 4px' }}>Admin-Bereich</h1>
          <p style={{ color: 'var(--mid)', fontSize: 15, margin: 0 }}>Karohilft Verwaltung</p>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {[{
            href: '/admin/plan-stunden',
            title: 'Stundenplan',
            desc: 'Stundeneinsätze verwalten & abrechnen'
          }, {
            href: '/admin/clients',
            title: 'Klienten',
            desc: 'Betreute Personen'
          }, {
            href: '/admin/users',
            title: 'Betreuer',
            desc: 'Benutzer verwalten'
          }].map(item => (
            <button key={item.href} onClick={() => router.push(item.href)}
              style={{ background: '#fff', border: '1.5px solid rgba(28,24,20,.08)', borderRadius: 'var(--r-md)', padding: '18px 20px', textAlign: 'left', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', transition: 'all .2s' }}>
              <div style={{ fontWeight: 600, fontSize: 17, color: 'var(--dark)', marginBottom: 3 }}>{item.title}</div>
              <div style={{ fontSize: 14, color: 'var(--mid)' }}>{item.desc}</div>
            </button>
          ))}
        </div>

        <button onClick={async () => { await getSupabase().auth.signOut(); router.replace('/login') }}
          style={{ marginTop: 24, width: '100%', padding: '14px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: 'transparent', color: 'var(--mid)', fontSize: 15, cursor: 'pointer' }}>
          Abmelden
        </button>
      </div>
    </div>
  )
}
