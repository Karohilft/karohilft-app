import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../lib/supabase'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const token = data.session.access_token
      const res = await fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        router.replace('/admin')
      } else {
        router.replace('/betreuer')
      }
    })
  }, [router])
  return null
}
