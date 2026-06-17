import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  useEffect(() => {
    const hash = window.location.hash
    const isRecovery = hash.includes('type=recovery')
    getSupabase().auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      if (isRecovery || data.session.user.user_metadata?.must_change_password) {
        router.replace('/update-password')
      } else {
        router.replace('/admin')
      }
    })
  }, [router])
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--mid)' }}>Weiterleitung…</p>
    </div>
  )
}
