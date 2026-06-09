import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../lib/supabase'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const email = data.session.user.email
      const { data: cg } = await getSupabase().from('caregivers').select('role').eq('email', email).single()
      if (cg?.role === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/betreuer')
      }
    })
  }, [router])
  return null
}
