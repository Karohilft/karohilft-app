export function formatCardNumber(n: number | null | undefined) {
  if (n == null) return '–'
  return `KH-${String(n).padStart(4, '0')}`
}
