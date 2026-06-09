import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabase } from '../../lib/supabase'

export default function ScanPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
    })
  }, [router])

  useEffect(() => {
    let stopped = false

    async function start() {
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser')
        const reader = new BrowserQRCodeReader()
        const devices = await BrowserQRCodeReader.listVideoInputDevices()
        // Rückkamera bevorzugen
        const device = devices.find(d => /back|rear|environment/i.test(d.label)) ?? devices[devices.length - 1]
        const deviceId = device?.deviceId

        setScanning(true)

        reader.decodeFromVideoDevice(deviceId ?? undefined, videoRef.current!, (result, err, controls) => {
          if (stopped) { controls.stop(); return }
          if (!result) return
          const url = result.getText()
          const match = url.match(/[?&]k=([^&]+)/)
          if (match) {
            stopped = true
            controls.stop()
            router.replace(`/eintrag?k=${match[1]}`)
          }
        })
      } catch {
        setError('Kamerazugriff verweigert. Bitte Kamera-Berechtigung in den Einstellungen erlauben.')
      }
    }

    start()
    return () => { stopped = true }
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
        {error ? (
          <div style={{ background: 'var(--cream)', borderRadius: 'var(--r-lg)', padding: 32, margin: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
            <p style={{ color: 'var(--dark)', marginBottom: 20 }}>{error}</p>
            <button onClick={() => router.back()} style={{ padding: '12px 28px', borderRadius: 'var(--r-pill)', border: 'none', background: 'linear-gradient(145deg, var(--rose), var(--rose-dark))', color: '#fff', fontSize: 15, cursor: 'pointer' }}>Zurück</button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: '100%', display: 'block', borderRadius: 12 }}
            />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: 220, height: 220, border: '3px solid rgba(255,255,255,0.85)', borderRadius: 16, boxShadow: '0 0 0 2000px rgba(0,0,0,0.45)' }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 16, fontSize: 14, padding: '0 20px' }}>
              {scanning ? 'QR-Code der Klientenkarte in den Rahmen halten' : 'Kamera startet…'}
            </p>
          </>
        )}
      </div>
      <button
        onClick={() => router.back()}
        style={{ marginTop: 24, padding: '10px 28px', borderRadius: 'var(--r-pill)', border: '1.5px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer' }}
      >
        Abbrechen
      </button>
    </div>
  )
}
