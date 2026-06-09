import { useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function waitForSessionToken(timeoutMs = 2000, intervalMs = 200) {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      try {
        const { data } = await getSupabase().auth.getSession()
        const token = data?.session?.access_token
        if (token) return token
      } catch { }
      await new Promise((r) => setTimeout(r, intervalMs))
    }
    return null
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout nach 10s – Supabase nicht erreichbar')), 10000)
      )
      const result = await Promise.race([
        getSupabase().auth.signInWithPassword({ email, password }),
        timeout
      ]) as Awaited<ReturnType<typeof getSupabase>['auth']['signInWithPassword']>

      if (result.error) {
        setBusy(false)
        setErr(result.error.message)
        return
      }
    } catch (e: any) {
      setBusy(false)
      setErr(e.message || 'Unbekannter Fehler')
      return
    }

    const nextRaw = (router.query.next as string) || '/admin'
    let target: string
    try { target = decodeURIComponent(nextRaw) } catch { target = nextRaw }
    if (!/^https?:\/\//i.test(target)) {
      if (!target.startsWith('/')) target = '/' + target
      const token = await waitForSessionToken(2000, 200)
      if (token) { router.replace(target); setBusy(false); return }
    }
    window.location.href = target
    setBusy(false)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NICHT GESETZT'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-md)', padding: '40px 32px 36px' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <img src="/karohilft-logo.png" alt="Karohilft" style={{ width: 160, margin: '0 auto 8px' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--dark)', textAlign: 'center', margin: '0 0 28px' }}>Willkommen</h1>
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
            <input placeholder="E-Mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '13px 16px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 16, fontFamily: 'var(--font-body)', color: 'var(--dark)', background: '#fff', margin: 0 }} />
            <input placeholder="Passwort" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '13px 16px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 16, fontFamily: 'var(--font-body)', color: 'var(--dark)', background: '#fff', margin: 0 }} />
            {err && <div style={{ color: '#C0392B', fontWeight: 500, fontSize: 14, textAlign: 'center' }}>{err}</div>}
            <button type="submit" disabled={busy} style={{ marginTop: 4, padding: '15px 32px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, fontSize: 16, fontFamily: 'var(--font-body)', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1, boxShadow: '0 6px 28px var(--rose-glow)', transition: 'all .3s ease' }}>
              {busy ? 'Einloggen…' : 'Einloggen'}
            </button>
          </form>
          <p style={{ marginTop: 16, fontSize: 14, color: 'var(--mid)', textAlign: 'center' }}>
            <a href="/forgot-password" style={{ color: 'var(--rose)' }}>Passwort vergessen?</a>
          </p>
          <p style={{ marginTop: 8, fontSize: 10, color: '#aaa', textAlign: 'center', wordBreak: 'break-all' }}>
            DB: {supabaseUrl}
          </p>
        </div>
      </div>
    </div>
  )
}
