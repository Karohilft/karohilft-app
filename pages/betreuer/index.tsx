import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

export default function BetreuerIndex() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/betreuer/eintrag')
  }, [router])
  return null
}
