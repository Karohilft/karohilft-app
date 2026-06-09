import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../lib/supabase'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const email = data.session.user.email
      const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase())
      const metaRole = data.session.user.user_metadata?.role
      const { data: cg } = await getSupabase().from('caregivers').select('role').eq('email', email).single()
      const isAdmin = cg?.role === 'admin' || metaRole === 'admin' || adminEmails.includes(email?.toLowerCase() ?? '')
      router.replace(isAdmin ? '/admin' : '/betreuer')
    })
  }, [router])
  return null
}
