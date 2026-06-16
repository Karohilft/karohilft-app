import { useEffect, useRef, useState } from 'react'

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']
const ITEM_H = 50

function WheelCol({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const idx = items.indexOf(value)
    if (idx < 0) return
    busy.current = true
    el.scrollTop = idx * ITEM_H
    setTimeout(() => { busy.current = false }, 300)
  }, [value, items])

  function onScroll() {
    if (busy.current) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const el = ref.current
      if (!el) return
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H)))
      busy.current = true
      el.scrollTop = idx * ITEM_H
      setTimeout(() => { busy.current = false }, 300)
      onChange(items[idx])
    }, 80)
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        background: 'linear-gradient(to bottom, rgba(255,255,255,.95) 0%, rgba(255,255,255,.3) 35%, transparent 45%, transparent 55%, rgba(255,255,255,.3) 65%, rgba(255,255,255,.95) 100%)' }} />
      <div style={{ position: 'absolute', top: '50%', left: 4, right: 4, height: ITEM_H,
        transform: 'translateY(-50%)', borderTop: '1.5px solid rgba(28,24,20,.2)', borderBottom: '1.5px solid rgba(28,24,20,.2)',
        pointerEvents: 'none', zIndex: 1 }} />
      <div ref={ref} onScroll={onScroll}
        style={{ height: ITEM_H * 5, overflowY: 'scroll', scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch' as any, scrollbarWidth: 'none' as any }}>
        <div style={{ height: ITEM_H * 2 }} />
        {items.map(item => (
          <div key={item} style={{ height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 500, color: 'var(--dark)', scrollSnapAlign: 'center' as any, userSelect: 'none' }}>
            {item}
          </div>
        ))}
        <div style={{ height: ITEM_H * 2 }} />
      </div>
    </div>
  )
}

export default function WheelTimePicker({ value, onChange, style }: {
  value: string; onChange: (v: string) => void; style?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value || '08:00')

  function handleOpen() {
    setDraft(value || '08:00')
    setOpen(true)
  }

  function confirm() {
    onChange(draft)
    setOpen(false)
  }

  const parts = draft.split(':')
  const dh = parts[0] || '08'
  const dm = parts[1] || '00'

  return (
    <>
      <button type="button" onClick={handleOpen}
        style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)',
          fontSize: 15, background: '#fff', color: value ? 'var(--dark)' : 'var(--mid)',
          cursor: 'pointer', textAlign: 'center', minWidth: 80, fontWeight: value ? 600 : 400, ...style }}>
        {value || '–'}
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)' }} onClick={() => setOpen(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '20px 20px 0 0', padding: '0 0 24px', boxShadow: '0 -4px 32px rgba(0,0,0,.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
              <button type="button" onClick={() => setOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--mid)', fontSize: 16, cursor: 'pointer', padding: '4px 8px' }}>
                Abbrechen
              </button>
              <button type="button" onClick={confirm}
                style={{ background: 'var(--rose)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 600,
                  cursor: 'pointer', padding: '6px 20px', borderRadius: 'var(--r-pill)' }}>
                Fertig
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', gap: 4 }}>
              <WheelCol items={HOURS} value={dh} onChange={h => setDraft(`${h}:${dm}`)} />
              <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--dark)', flexShrink: 0 }}>:</span>
              <WheelCol items={MINUTES} value={MINUTES.includes(dm) ? dm : '00'} onChange={m => setDraft(`${dh}:${m}`)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
