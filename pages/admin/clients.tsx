import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
)

type Client = { id: string; name: string; city: string; needs: string; created_at: string }

export default function AdminClients() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      supabase.from('clients').select('*').order('name').then(({ data }) => {
        setClients(data || [])
        setLoading(false)
      })
    })
  }, [router])

  if (loading) return <div style={{minHeight:'100vh',background:'var(--cream)',display:'flex',alignItems:'center',justifyContent:'center'}}><p>Lädt…</p></div>

  return (
    <div style={{minHeight:'100vh',background:'var(--cream)',padding:20}}>
      <div style={{maxWidth:720,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
          <button onClick={() => router.back()} style={{background:'transparent',border:'none',color:'var(--rose)',fontSize:24,cursor:'pointer',padding:0}}>←</button>
          <h1 style={{fontFamily:'var(--font-display)',fontWeight:400,fontSize:26,color:'var(--dark)',margin:0}}>Klienten</h1>
        </div>
        {clients.length === 0 ? (
          <div style={{background:'#fff',borderRadius:'var(--r-lg)',padding:32,textAlign:'center',color:'var(--mid)'}}>Noch keine Klienten.</div>
        ) : clients.map(c => (
          <div key={c.id} style={{background:'#fff',borderRadius:'var(--r-md)',padding:'16px 20px',marginBottom:10,boxShadow:'var(--shadow-sm)'}}>
            <div style={{fontWeight:600,color:'var(--dark)'}}>{c.name}</div>
            <div style={{fontSize:14,color:'var(--mid)',marginTop:4}}>{c.city} · {c.needs}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
