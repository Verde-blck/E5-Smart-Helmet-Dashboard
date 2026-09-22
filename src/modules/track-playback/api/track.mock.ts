import type { TelemetrySample } from '@/modules/devices/types'

/** Seeded so a given helmet walks the same route every time it's replayed. */
function mulberry32(seed: number) {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFor(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return Math.abs(hash) || 1
}

const STEP_MS = 60_000

/**
 * A plausible walk rather than scattered coordinates.
 *
 * The device mocks jitter lat/lng independently per sample, which is fine for
 * a single position on a map but replays as noise — the helmet appears to
 * teleport around the site. Here the heading carries over between steps and
 * turns gradually, with occasional stationary stretches, so the result reads
 * as someone moving around a site and stopping to work.
 */
export function getMockTrackSamples(
  deviceId: string,
  from: number,
  to: number
): TelemetrySample[] {
  const rand = mulberry32(seedFor(deviceId))
  const samples: TelemetrySample[] = []

  let lat = 6.5244 + (rand() - 0.5) * 0.01
  let lng = 3.3792 + (rand() - 0.5) * 0.01
  let heading = rand() * Math.PI * 2
  let battery = 96

  // Cap the work: a long range at one-minute steps is a lot of points, and
  // the real endpoint would be paginated anyway.
  const steps = Math.min(Math.floor((to - from) / STEP_MS), 1500)

  for (let i = 0; i < steps; i += 1) {
    const ts = from + i * STEP_MS

    // Stationary roughly one step in six — working rather than walking.
    const moving = rand() > 0.16
    if (moving) {
      heading += (rand() - 0.5) * 0.8
      // Around 1.2 m/s, expressed in degrees at this latitude.
      const metres = 50 + rand() * 40
      lat += (metres / 111_320) * Math.cos(heading)
      lng += (metres / (111_320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(heading)
    }

    if (i % 12 === 0) battery = Math.max(5, battery - 1)

    samples.push({
      ts,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      altitude: Number((38 + rand() * 14).toFixed(1)),
      batteryPercent: battery,
      signalStrength: -Math.round(62 + rand() * 40),
      isWorn: true,
    })
  }

  return samples
}
