import { useState } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
)

export default function UpdatePassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string|null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) { setErr(error.message); return }
    router.replace('/login')
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--cream)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:420}}>
        <div style={{background:'var(--glass-bg)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:'1px solid var(--glass-border)',borderRadius:'var(--r-lg)',boxShadow:'var(--shadow-md)',padding:'40px 32px 36px'}}>
          <h1 style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:400,color:'var(--dark)',textAlign:'center',margin:'0 0 24px'}}>Neues Passwort</h1>
          <form onSubmit={onSubmit} style={{display:'grid',gap:14}}>
            <input placeholder="Neues Passwort" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{padding:'13px 16px',border:'1.5px solid rgba(28,24,20,.12)',borderRadius:'var(--r-sm)',fontSize:16,margin:0}} />
            {err && <div style={{color:'#C0392B',fontSize:14,textAlign:'center'}}>{err}</div>}
            <button type="submit" disabled={busy} style={{padding:'15px 32px',borderRadius:'var(--r-pill)',border:'none',background:'linear-gradient(145deg, var(--rose), var(--rose-dark))',color:'#fff',fontWeight:500,fontSize:16,cursor:'pointer',boxShadow:'0 6px 28px var(--rose-glow)'}}>\n              {busy ? 'Speichern…' : 'Passwort speichern'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
