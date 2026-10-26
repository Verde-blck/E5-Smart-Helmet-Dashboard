export function hexToRgbChannels(hex: string): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null

  let value = match[1]
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('')
  }

  const int = parseInt(value, 16)
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`
}

export function applyBrandColors(colors: { primary: string; secondary: string }) {
  const root = document.documentElement
  const primary = hexToRgbChannels(colors.primary)
  const secondary = hexToRgbChannels(colors.secondary)
  if (primary) root.style.setProperty('--brand-primary', primary)
  if (secondary) root.style.setProperty('--brand-secondary', secondary)
}
