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
    let stream: MediaStream | null = null
    let interval: ReturnType<typeof setInterval> | null = null

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setScanning(true)
        }
      } catch {
        setError('Kamerazugriff verweigert. Bitte Kamera-Berechtigung erlauben.')
      }
    }

    async function scanFrame() {
      const video = videoRef.current
      if (!video || video.readyState < 2) return
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(video, 0, 0)
        // @ts-ignore
        if ('BarcodeDetector' in window) {
          // @ts-ignore
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
          const codes = await detector.detect(canvas)
          if (codes.length > 0) {
            const url = codes[0].rawValue
            const match = url.match(/[?&]k=([^&]+)/)
            if (match) {
              if (stream) stream.getTracks().forEach(t => t.stop())
              if (interval) clearInterval(interval)
              router.replace(`/eintrag?k=${match[1]}`)
            }
          }
        }
      } catch { /* ignore */ }
    }

    startCamera()
    interval = setInterval(scanFrame, 500)

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop())
      if (interval) clearInterval(interval)
    }
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
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
            {/* Fadenkreuz */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: 200, height: 200, border: '3px solid rgba(255,255,255,0.8)', borderRadius: 16, boxShadow: '0 0 0 2000px rgba(0,0,0,0.4)' }} />
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
