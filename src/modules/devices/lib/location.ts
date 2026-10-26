import type { FixType, Telemetry } from '../types'

export interface LocationQuality {
  approximate: boolean
  radiusM: number | null
  label: string
}

const SOURCE: Record<FixType, string> = {
  gps: 'GPS',
  network: 'mobile network',
  wifi: 'Wi-Fi',
  other: 'other',
}

const TYPICAL_RADIUS_M: Record<FixType, number> = { gps: 10, network: 300, wifi: 50, other: 200 }

export function locationQuality(t: Pick<Telemetry, 'fixType' | 'gpsLevel' | 'accuracyMeters'>): LocationQuality | null {
  if (!t.fixType) return null
  const noGps = t.gpsLevel === -1 && t.fixType === 'gps'
  const approximate = t.fixType !== 'gps' || noGps
  const radius = t.accuracyMeters ?? (approximate ? TYPICAL_RADIUS_M[t.fixType] : null)
  const accuracy = radius != null ? ` · ±${radius < 10 ? radius.toFixed(1) : Math.round(radius)} m` : ''
  return {
    approximate,
    radiusM: radius,
    label: approximate ? `Approximate · ${SOURCE[t.fixType]}${accuracy}` : `GPS${accuracy}`,
  }
}
