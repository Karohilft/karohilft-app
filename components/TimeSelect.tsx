const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

export default function TimeSelect({ value, onChange, style }: { value: string; onChange: (v: string) => void; style?: React.CSSProperties }) {
  const [h, m] = value ? value.split(':') : ['', '']

  const selectStyle: React.CSSProperties = { padding: '6px 6px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 14, background: '#fff', ...style }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <select value={h} onChange={e => onChange(`${e.target.value}:${m || '00'}`)} style={selectStyle}>
        <option value="">–</option>
        {HOURS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span>:</span>
      <select value={m} onChange={e => onChange(`${h || '00'}:${e.target.value}`)} style={selectStyle}>
        <option value="">–</option>
        {MINUTES.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
