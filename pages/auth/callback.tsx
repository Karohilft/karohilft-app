import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      router.replace(data.session ? '/admin' : '/login')
    })
  }, [router])
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--mid)' }}>Weiterleitung…</p>
    </div>
  )
}
