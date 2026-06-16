import { useEffect, useRef } from 'react'

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']
const ITEM_H = 46

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
    setTimeout(() => { busy.current = false }, 200)
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
      setTimeout(() => { busy.current = false }, 200)
      onChange(items[idx])
    }, 100)
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        background: 'linear-gradient(to bottom, rgba(255,255,255,.95) 0%, rgba(255,255,255,.4) 30%, transparent 45%, transparent 55%, rgba(255,255,255,.4) 70%, rgba(255,255,255,.95) 100%)' }} />
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: ITEM_H,
        transform: 'translateY(-50%)', borderTop: '1px solid rgba(28,24,20,.18)', borderBottom: '1px solid rgba(28,24,20,.18)',
        pointerEvents: 'none', zIndex: 1 }} />
      <div ref={ref} onScroll={onScroll}
        style={{ height: ITEM_H * 5, overflowY: 'scroll', scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch' as any, scrollbarWidth: 'none' as any }}>
        <div style={{ height: ITEM_H * 2 }} />
        {items.map(item => (
          <div key={item} style={{ height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 500, color: 'var(--dark)', scrollSnapAlign: 'center' as any,
            userSelect: 'none' }}>
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
  const parts = value ? value.split(':') : ['', '']
  const h = parts[0] || ''
  const m = parts[1] || ''

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderRadius: 'var(--r-md)',
      overflow: 'hidden', background: 'rgba(28,24,20,.04)', ...style }}>
      <WheelCol items={HOURS} value={h || '08'} onChange={newH => onChange(`${newH}:${m || '00'}`)} />
      <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--dark)', flexShrink: 0, marginBottom: 2 }}>:</span>
      <WheelCol items={MINUTES} value={MINUTES.includes(m) ? m : '00'} onChange={newM => onChange(`${h || '08'}:${newM}`)} />
    </div>
  )
}
