import type { FixType, Telemetry } from '../types'

/**
 * How far to trust a helmet's position.
 *
 * GPS outdoors is about 3 m. Indoors helmets fall back to the mobile network
 * or Wi-Fi, which can be tens to hundreds of metres off; those positions are
 * shown as approximate, with a circle for their likely area.
 */
export interface LocationQuality {
  approximate: boolean
  /** Radius of the likely area, in metres; null when not known. */
  radiusM: number | null
  /** "GPS · ±3 m", "Approximate · mobile network · ±300 m" */
  label: string
}

const SOURCE: Record<FixType, string> = {
  gps: 'GPS',
  network: 'mobile network',
  wifi: 'Wi-Fi',
  other: 'other',
}

/** When the helmet doesn't give a radius: typical errors for each source. */
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
