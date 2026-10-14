/**
 * Connection quality as 0–4 bars, from whatever the helmet reports.
 *
 * The API sends `lastNetStrength` without a unit, and helmets in this class
 * use different scales, so the value is read by its range:
 *   negative        → dBm (e.g. −82)
 *   0–5             → bars, as the helmet shows them
 *   6–31            → the modem's CSQ score (99 = unknown)
 *   32–100          → a percentage
 * If the backend confirms one scale, collapse this to that branch. The one
 * real ambiguity is 0–5, which could also be a very weak CSQ.
 */
export type SignalBars = 0 | 1 | 2 | 3 | 4

export interface SignalQuality {
  bars: SignalBars
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'No signal'
  /** The raw value with its unit, for tooltips: "−82 dBm", "CSQ 18". */
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
