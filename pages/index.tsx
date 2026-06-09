import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../lib/supabase'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/admin')
      } else {
        router.replace('/login')
      }
    })
  }, [router])
  return null
}
