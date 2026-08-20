function stripToDigits(s: string): string {
  return s.replace(/[^\d+]/g, '')
}

export function normalizePhone(raw: string): string {
  const s = stripToDigits(raw.trim())
  if (!s) return raw.trim()
  if (s.startsWith('+43')) return s
  if (s.startsWith('+')) return s
  if (s.startsWith('0043')) return '+43' + s.slice(4)
  if (s.startsWith('0')) return '+43' + s.slice(1)
  return s
}

// +43 664 841 50 62
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const normalized = normalizePhone(raw)
  // match +43, then 3-digit Vorwahl, then rest
  const m = normalized.match(/^(\+43)(\d{3})(\d+)$/)
  if (m) {
    const [, prefix, vorwahl, rest] = m
    // first group of 3, then pairs of 2
    const parts: string[] = [rest.slice(0, 3)]
    let i = 3
    while (i < rest.length) { parts.push(rest.slice(i, i + 2)); i += 2 }
    return `${prefix} ${vorwahl} ${parts.join(' ')}`
  }
  return normalized
}
