export default function TimeSelect({ value, onChange, style }: { value: string; onChange: (v: string) => void; style?: React.CSSProperties }) {
  return (
    <input
      type="time"
      step={900}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ padding: '11px 14px', border: '1.5px solid rgba(28,24,20,.12)', borderRadius: 'var(--r-sm)', fontSize: 15, background: '#fff', width: '100%', boxSizing: 'border-box', ...style }}
    />
  )
}
