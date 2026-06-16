const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

export default function TimeSelect({ value, onChange, style }: { value: string; onChange: (v: string) => void; style?: React.CSSProperties }) {
  const [h, m] = value ? value.split(':') : ['', '']

  const selectStyle: React.CSSProperties = {
    padding: '10px 8px',
    border: '1.5px solid rgba(28,24,20,.12)',
    borderRadius: 'var(--r-sm)',
    fontSize: 15,
    background: '#fff',
    color: 'var(--dark)',
    flex: 1,
    minWidth: 0,
    appearance: 'none' as any,
    WebkitAppearance: 'none' as any,
    textAlign: 'center' as any,
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', ...style }}>
      <select value={h} onChange={e => onChange(`${e.target.value}:${m || '00'}`)} style={selectStyle}>
        <option value="">–</option>
        {HOURS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--mid)', flexShrink: 0 }}>:</span>
      <select value={m} onChange={e => onChange(`${h || '00'}:${e.target.value}`)} style={selectStyle}>
        <option value="">–</option>
        {MINUTES.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
