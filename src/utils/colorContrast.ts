/**
 * Utility for determining optimal WCAG-compliant high-contrast text color
 * based on background color perceived luminance (YIQ formula).
 */
export function getContrastColor(
  hexColor?: string,
  darkText = '#0f172a',
  lightText = '#ffffff'
): string {
  if (!hexColor) return lightText
  const cleanHex = hexColor.replace('#', '').trim()
  let hex = cleanHex
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('')
  }
  if (hex.length !== 6) return lightText
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return lightText
  // Perceived brightness calculation (YIQ)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 150 ? darkText : lightText
}
