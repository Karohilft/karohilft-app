import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../lib/supabase'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const email = data.session.user.email
      // Rolle aus user_metadata (gesetzt beim Login/Register) als Fallback
      const metaRole = data.session.user.user_metadata?.role
      const { data: cg, error } = await getSupabase().from('caregivers').select('role').eq('email', email).single()
      const role = cg?.role ?? metaRole
      if (role === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/betreuer')
      }
    })
  }, [router])
  return null
}
