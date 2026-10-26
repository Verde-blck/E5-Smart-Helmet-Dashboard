export type SignalBars = 0 | 1 | 2 | 3 | 4

export interface SignalQuality {
  bars: SignalBars
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'No signal'
  detail: string
}

const LABELS: SignalQuality['label'][] = ['No signal', 'Poor', 'Fair', 'Good', 'Excellent']

function quality(bars: SignalBars, detail: string): SignalQuality {
  return { bars, label: LABELS[bars], detail }
}

function clampBars(n: number): SignalBars {
  return Math.max(0, Math.min(4, Math.round(n))) as SignalBars
}

export function signalQuality(value: number | null | undefined): SignalQuality | null {
  if (value == null || !Number.isFinite(value) || value === 99) return null

  if (value < 0) {
    const bars = value >= -75 ? 4 : value >= -85 ? 3 : value >= -95 ? 2 : value >= -105 ? 1 : 0
    return quality(bars, `${value} dBm`)
  }
  if (value <= 5) return quality(clampBars(value === 5 ? 4 : value), `${value} of 5 bars`)
  if (value <= 31) {
    const bars = value >= 20 ? 4 : value >= 15 ? 3 : value >= 10 ? 2 : value >= 2 ? 1 : 0
    return quality(bars, `CSQ ${value}`)
  }
  if (value <= 100) {
    const bars = value >= 75 ? 4 : value >= 50 ? 3 : value >= 25 ? 2 : value > 0 ? 1 : 0
    return quality(bars, `${value}%`)
  }
  return null
}
