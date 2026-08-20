// Normalize to E.164-ish: leading 0 → +43, strip non-digits after prefix
export function normalizePhone(raw: string): string {
  const s = raw.trim()
  if (!s) return s
  if (s.startsWith('+')) return s
  if (s.startsWith('00')) return '+' + s.slice(2)
  if (s.startsWith('0')) return '+43' + s.slice(1)
  return s
}

// Format for display: +43 677 12345678 → +43 677 123 456 78
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const normalized = normalizePhone(raw)
  // +43 followed by digits
  const m = normalized.match(/^(\+43)(\d{3,4})(\d+)$/)
  if (m) {
    const [, prefix, vorwahl, rest] = m
    // split rest into groups of 3 from left
    const groups = rest.match(/.{1,3}/g) || [rest]
    return `${prefix} ${vorwahl} ${groups.join(' ')}`
  }
  return normalized
}
