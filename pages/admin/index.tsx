import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
)

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setLoading(false)
    })
  }, [router])

  if (loading) return <div style={{minHeight:'100vh',background:'var(--cream)',display:'flex',alignItems:'center',justifyContent:'center'}}><p>Lädt…</p></div>

  return (
    <div style={{minHeight:'100vh',background:'var(--cream)',padding:20}}>
      <div style={{maxWidth:720,margin:'0 auto'}}>
        <div style={{background:'#fff',borderRadius:'var(--r-lg)',boxShadow:'var(--shadow-md)',padding:'32px 28px',marginBottom:16}}>
          <img src="/karohilft-logo.png" alt="Karohilft" style={{width:140,margin:'0 auto 20px'}} />
          <h1 style={{fontFamily:'var(--font-display)',fontWeight:400,fontSize:28,color:'var(--dark)',textAlign:'center',margin:'0 0 8px'}}>Admin-Bereich</h1>
          <p style={{textAlign:'center',color:'var(--mid)',marginBottom:28}}>Karohilft Verwaltung</p>
          <div style={{display:'grid',gap:12}}>
            {[
              {href:'/admin/activity',label:'Aktivitäten',desc:'Tätigkeitsberichte einsehen'},
              {href:'/admin/plan-stunden',label:'Stundenplan',desc:'Stundeneinsätze verwalten'},
              {href:'/admin/clients',label:'Klienten',desc:'Betreute Personen'},
              {href:'/admin/users',label:'Betreuer',desc:'Benutzer verwalten'},
            ].map(item => (
              <a key={item.href} href={item.href} style={{display:'block',padding:'16px 20px',borderRadius:'var(--r-md)',border:'1.5px solid var(--cream-alt)',background:'var(--cream)',textDecoration:'none',transition:'all .2s'}}>
                <div style={{fontWeight:600,color:'var(--dark)',marginBottom:2}}>{item.label}</div>
                <div style={{fontSize:14,color:'var(--mid)'}}>{item.desc}</div>
              </a>
            ))}
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.replace('/login'))} style={{marginTop:20,padding:'12px 24px',borderRadius:'var(--r-pill)',border:'1.5px solid rgba(28,24,20,.12)',background:'transparent',color:'var(--mid)',fontSize:15,cursor:'pointer',width:'100%'}}>
            Abmelden
          </button>
        </div>
      </div>
    </div>
  )
}
