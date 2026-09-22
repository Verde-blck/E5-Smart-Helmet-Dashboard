export interface TrackPoint {
  ts: number
  lat: number
  lng: number
  altitude?: number
  batteryPercent?: number
  /** Metres from the previous point. Zero for the first. */
  stepMetres: number
  /** Metres per second over the leg leading to this point. */
  speedMps: number
  /**
   * Which continuous run this point belongs to. A new segment starts after a
   * coverage gap or an implausible jump, so a line is never drawn across
   * either.
   */
  segment: number
}

export interface TrackStats {
  points: number
  /** Total distance walked, in metres. */
  distanceMetres: number
  /** Wall-clock span from first to last fix. */
  durationMs: number
  /** Time actually moving, excluding stationary stretches. */
  movingMs: number
  maxSpeedMps: number
  /** Longest stretch with no position at all — a coverage gap. */
  longestGapMs: number
  /** Continuous runs the track breaks into. One means an unbroken path. */
  segments: number
  /**
   * Fixes rejected as physically impossible — a position that would require
   * travelling faster than any vehicle. Usually factory or test readings left
   * in the device's history.
   */
  impossibleJumps: number
}

export interface Track {
  deviceId: string
  from: number
  to: number
  points: TrackPoint[]
  stats: TrackStats
  /** True when the API's page limit may have cut the range short. */
  truncated: boolean
}
