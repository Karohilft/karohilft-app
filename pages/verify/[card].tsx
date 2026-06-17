import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { formatCardNumber } from '../../lib/cardNumber'

type Result = { found: true; name: string; card_number: number; birthdate: string | null; type: string; role: string } | { found: false }

export default function VerifyCard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    if (!router.isReady) return
    const card = router.query.card as string
    if (!card) return
    fetch(`/api/verify/${encodeURIComponent(card)}`)
      .then(r => r.json())
      .then(data => { setResult(data); setLoading(false) })
      .catch(() => { setResult({ found: false }); setLoading(false) })
  }, [router.isReady, router.query.card])

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--cream, #FAF5EE)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <img src="/karohilft-logo.png" alt="Karohilft" style={{ width: 160, margin: '0 auto 24px', display: 'block' }} />

        {loading && <p style={{ color: '#8C857D', fontSize: 15 }}>Wird überprüft…</p>}

        {!loading && result?.found && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', boxShadow: '0 2px 12px rgba(28,24,20,.06)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(145deg, #4CAF50, #388E3C)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>✓</div>
            <h1 style={{ fontFamily: 'var(--font-display, "DM Serif Display", serif)', fontWeight: 400, fontSize: 24, color: '#1C1814', margin: '0 0 4px' }}>{result.name}</h1>
            <p style={{ color: '#8C857D', fontSize: 14, margin: '0 0 4px' }}>{result.type}</p>
            {result.birthdate && <p style={{ color: '#8C857D', fontSize: 13, margin: '0 0 4px' }}>geb. {new Date(result.birthdate).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>}
            <p style={{ color: '#8C857D', fontSize: 13, margin: '0 0 20px' }}>{formatCardNumber(result.card_number)}</p>
            <div style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 20, background: 'rgba(76,175,80,.1)', color: '#388E3C', fontWeight: 600, fontSize: 14 }}>
              Aktiv ✅
            </div>
          </div>
        )}

        {!loading && result && !result.found && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '32px 28px', boxShadow: '0 2px 12px rgba(28,24,20,.06)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(145deg, #E53935, #C62828)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, color: '#fff' }}>✗</div>
            <h1 style={{ fontFamily: 'var(--font-display, "DM Serif Display", serif)', fontWeight: 400, fontSize: 24, color: '#1C1814', margin: '0 0 12px' }}>Nicht gefunden</h1>
            <p style={{ color: '#8C857D', fontSize: 14, margin: 0 }}>Diese Kartennummer ist nicht registriert oder nicht mehr aktiv.</p>
          </div>
        )}

        <p style={{ color: '#8C857D', fontSize: 12, marginTop: 24 }}>Karohilft GmbH · app.karohilft.at</p>
      </div>
    </div>
  )
}
