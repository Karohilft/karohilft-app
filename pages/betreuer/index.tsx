import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import { formatCardNumber } from '../../lib/cardNumber'

export default function BetreuerHome() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [cardNumber, setCardNumber] = useState<number | null>(null)
  const [birthdate, setBirthdate] = useState<string | null>(null)
  const [showCard, setShowCard] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSupabase().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const sessionEmail = data.session.user.email
      const { data: cg } = await getSupabase().from('caregivers').select('name,phone,email,birthdate,card_number').eq('email', sessionEmail).single()
      if (cg?.name) setName(cg.name)
      if (cg) { setPhone(cg.phone || ''); setEmail(cg.email || ''); setBirthdate(cg.birthdate); setCardNumber(cg.card_number) }
      setLoading(false)
    })
  }, [router])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--mid)' }}>Lädt…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: 20 }}>
      {showCard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 22, margin: '0 0 20px', color: 'var(--dark)' }}>Mein Ausweis</h2>
            <div id="print-card" style={{ width: 320, height: 202, border: '1px solid #e0ddd9', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, #FAF5EE 0%, #f5ede0 100%)', margin: '0 auto 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/karohilft-logo.png" alt="Karohilft" style={{ height: 36 }} />
                <span style={{ fontSize: 11, color: 'var(--mid)', letterSpacing: 1, textTransform: 'uppercase' }}>Betreuerkarte</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: 'var(--dark)' }}>{name}</div>
                  {birthdate && <div style={{ fontSize: 12, color: 'var(--mid)', marginTop: 2 }}>geb. {new Date(birthdate).toLocaleDateString('de-AT')}</div>}
                  {cardNumber != null && <div style={{ fontSize: 12, color: 'var(--mid)' }}>{formatCardNumber(cardNumber)}</div>}
                </div>
                <QRCodeSVG value={`https://app.karohilft.at/verify/${formatCardNumber(cardNumber)}`} size={72} bgColor="transparent" fgColor="#1C1814" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCard(false)} style={{ padding: '10px 20px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--mid)', cursor: 'pointer' }}>Schließen</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', paddingTop: 32, marginBottom: 32 }}>
          <img src="/karohilft-logo.png" alt="Karohilft" style={{ width: 160, margin: '0 auto 48px', display: 'block' }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--dark)', margin: '0 0 6px' }}>
            Hallo{name ? `, ${name.split(' ')[0]}` : ''}!
          </h1>
          <p style={{ color: 'var(--mid)', fontSize: 15, margin: 0 }}>Deine heutige Tour auf einen Blick.</p>
        </div>

        {/* QR-Scanner ausgeblendet – als Backup behalten */}
        <div style={{ display: 'none', background: '#fff', borderRadius: 'var(--r-lg)', padding: '28px 24px', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
          <div style={{ fontWeight: 600, fontSize: 17, color: 'var(--dark)', marginBottom: 6 }}>QR-Code scannen</div>
          <p style={{ fontSize: 14, color: 'var(--mid)', margin: '0 0 20px' }}>Halte die Kamera auf die Klientenkarte</p>
          <a href="/betreuer/scan" style={{ display: 'inline-block', padding: '13px 32px', borderRadius: 'var(--r-pill)', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontWeight: 500, fontSize: 16, textDecoration: 'none', boxShadow: '0 6px 20px var(--rose-glow)' }}>
            Scannen
          </a>
        </div>

        <button
          onClick={() => setShowCard(true)}
          style={{ marginTop: 14, width: '100%', padding: '13px', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--rose)', background: '#fff', color: 'var(--rose)', fontWeight: 500, fontSize: 16, cursor: 'pointer' }}
        >
          Mein Ausweis
        </button>

        <button
          onClick={() => router.push('/betreuer/plan')}
          style={{ marginTop: 10, width: '100%', padding: '13px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: '#fff', color: 'var(--dark)', fontWeight: 500, fontSize: 16, cursor: 'pointer' }}
        >
          Meine Tour
        </button>

        <button
          onClick={async () => { await getSupabase().auth.signOut(); router.replace('/login') }}
          style={{ marginTop: 20, width: '100%', padding: '13px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(28,24,20,.12)', background: 'transparent', color: 'var(--mid)', fontSize: 15, cursor: 'pointer' }}
        >
          Abmelden
        </button>
      </div>
    </div>
  )
}
