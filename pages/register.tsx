import { useState } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
)

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role: 'user' } }
    })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setDone(true)
  }

  if (done) return (
    <div style={{minHeight:'100vh',background:'var(--cream)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'var(--glass-bg)',borderRadius:'var(--r-lg)',padding:'40px 32px',maxWidth:420,width:'100%',textAlign:'center',boxShadow:'var(--shadow-md)'}}>
        <h1 style={{fontFamily:'var(--font-display)',fontWeight:400,color:'var(--dark)'}}>Bitte E-Mail bestätigen</h1>
        <p>Wir haben dir eine Bestätigungsmail geschickt. Bitte klicke auf den Link darin.</p>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'var(--cream)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:420}}>
        <div style={{background:'var(--glass-bg)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:'1px solid var(--glass-border)',borderRadius:'var(--r-lg)',boxShadow:'var(--shadow-md)',padding:'40px 32px 36px'}}>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:32,fontWeight:400,color:'var(--dark)',textAlign:'center',margin:'0 0 28px'}}>Registrieren</h1>
          <form onSubmit={onSubmit} style={{display:'grid',gap:14}}>
            <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} style={{padding:'13px 16px',border:'1.5px solid rgba(28,24,20,.12)',borderRadius:'var(--r-sm)',fontSize:16,fontFamily:'var(--font-body)',margin:0}} />
            <input placeholder="E-Mail" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={{padding:'13px 16px',border:'1.5px solid rgba(28,24,20,.12)',borderRadius:'var(--r-sm)',fontSize:16,fontFamily:'var(--font-body)',margin:0}} />
            <input placeholder="Passwort" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{padding:'13px 16px',border:'1.5px solid rgba(28,24,20,.12)',borderRadius:'var(--r-sm)',fontSize:16,fontFamily:'var(--font-body)',margin:0}} />
            {err && <div style={{color:'#C0392B',fontSize:14,textAlign:'center'}}>{err}</div>}
            <button type="submit" disabled={busy} style={{marginTop:4,padding:'15px 32px',borderRadius:'var(--r-pill)',border:'none',background:'linear-gradient(145deg, var(--rose), var(--rose-dark))',color:'#fff',fontWeight:500,fontSize:16,fontFamily:'var(--font-body)',cursor:busy?'not-allowed':'pointer',opacity:busy?0.7:1,boxShadow:'0 6px 28px var(--rose-glow)'}}>\n              {busy ? 'Registrieren…' : 'Registrieren'}
            </button>
          </form>
          <p style={{marginTop:16,fontSize:14,color:'var(--mid)'}}>Bereits registriert? <a href="/login" style={{color:'var(--rose)'}}>Einloggen</a></p>
        </div>
      </div>
    </div>
  )
}
