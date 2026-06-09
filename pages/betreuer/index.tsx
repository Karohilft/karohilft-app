import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

export default function BetreuerHome() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const email = data.session.user.email
      const { data: cg } = await getSupabase().from('caregivers').select('name').eq('email', email).single()
      if (cg?.name) setName(cg.name)
      setLoading(false)
    })
  }, [router])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--mid)' }}>Lädt…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', paddingTop: 32, marginBottom: 32 }}>
          <img src="/karohilft-logo.png" alt="Karohilft" style={{ width: 110, margin: '0 auto 16px', display: 'block' }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--dark)', margin: '0 0 6px' }}>
            Hallo{name ? `, ${name.split(' ')[0]}` : ''}!
          </h1>
          <p style={{ color: 'var(--mid)', fontSize: 15, margin: 0 }}>Scanne die Klientenkarte um einen Eintrag zu erfassen.</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '28px 24px', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
          <div style={{ fontWeight: 600, fontSize: 17, color: 'var(--dark)', marginBottom: 6 }}>QR-Code scannen</div>
          <p style={{ fontSize: 14, color: 'var(--mid)', margin: '0 0 20px' }}>Halte die Kamera auf die Klientenkarte</p>
          <a href="/betreuer/scan" style={{ display: 'inline-block', padding: '13px 32px', borderRadius: 'var(--r-pill)', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, fontSize: 16, textDecoration: 'none', boxShadow: '0 6px 20px var(--rose-glow)' }}>
            Scannen
          </a>
        </div>

        <button
          onClick={async () => { await getSupabase().auth.signOut(); router.replace('/login') }}
          style={{ marginTop: 20, width: '100%', padding: '13px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: 'transparent', color: 'var(--mid)', fontSize: 15, cursor: 'pointer' }}
        >
          Abmelden
        </button>
      </div>
    </div>
  )
}
