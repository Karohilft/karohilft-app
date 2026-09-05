import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

type KVA = {
  id: string
  angebotsnr: string
  klient: string | null
  strasse: string | null
  plz: string | null
  ort: string | null
  datum: string
  art: string
  status: string
  erstellt_am: string
}

function StatusBadge({ status }: { status: string }) {
  const isVersendet = status === 'versendet'
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: isVersendet ? '#e8f5e9' : '#FFF3E0',
      color: isVersendet ? '#2e7d32' : '#e65100',
    }}>
      {isVersendet ? 'Versendet' : 'Entwurf'}
    </span>
  )
}

export default function Angebote() {
  const router = useRouter()
  const [items, setItems] = useState<KVA[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await getSupabase()
      .from('kostenvoranschlaege')
      .select('id,angebotsnr,klient,strasse,plz,ort,datum,art,status,erstellt_am')
      .order('erstellt_am', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login')
      else load()
    })
  }, [router])

  async function del(id: string) {
    if (!confirm('Angebot wirklich löschen?')) return
    await getSupabase().from('kostenvoranschlaege').delete().eq('id', id)
    setItems(i => i.filter(x => x.id !== id))
  }

  async function toggleStatus(item: KVA) {
    const next = item.status === 'versendet' ? 'entwurf' : 'versendet'
    await getSupabase().from('kostenvoranschlaege').update({ status: next }).eq('id', item.id)
    setItems(i => i.map(x => x.id === item.id ? { ...x, status: next } : x))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--mid)' }}>Lädt…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', padding: '20px 16px 40px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => router.push('/admin')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', fontSize: 22, lineHeight: 1, padding: '4px 0' }}>←</button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--dark)', margin: 0 }}>Angebote</h1>
          <button onClick={() => router.push('/admin/kostenvoranschlag')}
            style={{ marginLeft: 'auto', background: 'var(--rose)', color: '#fff', border: 'none', borderRadius: 'var(--r-pill)', padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            + Neu
          </button>
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--mid)', padding: '60px 0', fontSize: 15 }}>
            Noch keine Angebote erstellt.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(item => (
              <div key={item.id} style={{ background: '#fff', borderRadius: 'var(--r-md)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--dark)' }}>{item.angebotsnr}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.klient && <div style={{ fontSize: 14, color: 'var(--dark)', fontWeight: 600 }}>{item.klient}</div>}
                  {(item.strasse || item.plz || item.ort) && (
                    <div style={{ fontSize: 13, color: 'var(--mid)', marginTop: 1 }}>
                      {[item.strasse, [item.plz, item.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#a09a94', marginTop: 4 }}>
                    {new Date(item.datum).toLocaleDateString('de-AT')} · {item.art === '24h' ? '24h-Betreuung' : 'Stundenbetreuung'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                  <button onClick={() => router.push(`/admin/kostenvoranschlag?id=${item.id}`)}
                    title="Ansehen / Bearbeiten"
                    style={{ background: 'none', border: '1px solid rgba(28,24,20,.15)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--mid)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    ✏ Öffnen
                  </button>
                  <button onClick={() => toggleStatus(item)}
                    title={item.status === 'versendet' ? 'Als Entwurf markieren' : 'Als versendet markieren'}
                    style={{ background: 'none', border: '1px solid rgba(28,24,20,.15)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--mid)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {item.status === 'versendet' ? '↩ Entwurf' : '✓ Versendet'}
                  </button>
                  <button onClick={() => del(item.id)}
                    title="Löschen"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 18, padding: '2px 4px', lineHeight: 1 }}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
