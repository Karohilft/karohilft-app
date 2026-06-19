import { useState } from 'react'
import { getSupabase } from '../lib/supabase'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !password) { setErr('Bitte alle Pflichtfelder ausfüllen.'); return }
    if (password.length < 6) { setErr('Passwort muss mindestens 6 Zeichen haben.'); return }
    setBusy(true)
    setErr(null)

    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role: 'user' } }
    })

    if (error) { setErr(error.message); setBusy(false); return }

    if (data.user) {
      await getSupabase().from('caregivers').insert({ name, email, phone: phone || null, birthdate: birthdate || null, role: 'user' })
    }

    setBusy(false)
    setDone(true)
  }

  if (done) return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: '48px 32px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 28, color: 'var(--dark)', margin: '0 0 12px' }}>Fast geschafft!</h1>
        <p style={{ color: 'var(--mid)', marginBottom: 24 }}>Wir haben dir eine Bestätigungsmail an <strong>{email}</strong> geschickt. Bitte bestätige deine Adresse.</p>
        <a href="/login" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 'var(--r-pill)', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, textDecoration: 'none', fontSize: 15 }}>Zum Login</a>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-md)', padding: '40px 32px 36px' }}>

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <img src="/karohilft-logo.svg" alt="Karohilft" style={{ width: 100, height: 'auto', margin: '0 auto 4px', display: 'block' }} />
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--dark)', textAlign: 'center', margin: '0 0 4px' }}>Als Betreuer registrieren</h1>
          <p style={{ fontSize: 14, color: 'var(--mid)', textAlign: 'center', margin: '0 0 24px' }}>Für Mitarbeiter von Karohilft</p>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
            <input placeholder="Name *" value={name} onChange={e => setName(e.target.value)} style={{ padding: '13px 16px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 16, margin: 0 }} />
            <input placeholder="E-Mail *" type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '13px 16px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 16, margin: 0 }} />
            <input placeholder="Telefon (optional)" type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={{ padding: '13px 16px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 16, margin: 0 }} />
            <label style={{ fontSize: 13, color: 'var(--mid)' }}>Geburtsdatum
              <input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} style={{ display: 'block', marginTop: 4, padding: '13px 16px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 16, width: '100%' }} />
            </label>
            <input placeholder="Passwort * (mind. 6 Zeichen)" type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '13px 16px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 16, margin: 0 }} />

            {err && <div style={{ color: '#C0392B', fontSize: 14, textAlign: 'center', padding: '8px 12px', background: 'rgba(192,57,43,.07)', borderRadius: 8 }}>{err}</div>}

            <button type="submit" disabled={busy} style={{ marginTop: 4, padding: '15px 32px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, fontSize: 16, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1, boxShadow: '0 6px 28px var(--rose-glow)' }}>
              {busy ? 'Registrieren…' : 'Registrieren'}
            </button>
          </form>

          <p style={{ marginTop: 20, fontSize: 14, color: 'var(--mid)', textAlign: 'center' }}>
            Bereits registriert?{' '}
            <a href="/login" style={{ color: 'var(--rose)', fontWeight: 500 }}>Einloggen</a>
          </p>
        </div>
      </div>
    </div>
  )
}
