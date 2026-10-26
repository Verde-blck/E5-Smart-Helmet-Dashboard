export interface TrackPoint {
  ts: number
  lat: number
  lng: number
  altitude?: number
  batteryPercent?: number
  stepMetres: number
  speedMps: number
  segment: number
  approximate?: boolean
  accuracyMeters?: number
}

export interface TrackStats {
  points: number
  distanceMetres: number
  durationMs: number
  movingMs: number
  maxSpeedMps: number
  longestGapMs: number
  segments: number
  impossibleJumps: number
  approximatePoints: number
}

export interface Track {
  deviceId: string
  from: number
  to: number
  points: TrackPoint[]
  stats: TrackStats
  truncated: boolean
}
