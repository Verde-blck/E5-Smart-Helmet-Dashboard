import { HEARTBEAT_MS } from './presence'
import type { HistoryRange, Presence, TelemetrySample, TelemetryWindow } from '../types'

export const HISTORY_RANGES: Record<HistoryRange, { label: string; durationMs: number; stepMs: number }> = {
  '1h': { label: 'Last hour', durationMs: 60 * 60_000, stepMs: 30_000 },
  '24h': { label: 'Last 24 hours', durationMs: 24 * 60 * 60_000, stepMs: 5 * 60_000 },
  '7d': { label: 'Last 7 days', durationMs: 7 * 24 * 60 * 60_000, stepMs: 30 * 60_000 },
}

export interface ConnectionPeriod {
  from: number
  to: number
  presence: Presence
}

export function deriveConnectionPeriods(window: TelemetryWindow): ConnectionPeriod[] {
  const { samples, rangeStart, rangeEnd, stepMs } = window
  const degradedAfter = Math.max(HEARTBEAT_MS * 3, stepMs * 1.5)
  const offlineAfter = Math.max(HEARTBEAT_MS * 10, stepMs * 3)

  const classify = (gapMs: number): Presence =>
    gapMs >= offlineAfter ? 'offline' : gapMs >= degradedAfter ? 'degraded' : 'online'

  const periods: ConnectionPeriod[] = []
  const push = (from: number, to: number, presence: Presence) => {
    if (to <= from) return
    const last = periods[periods.length - 1]
    if (last && last.presence === presence && last.to === from) last.to = to
    else periods.push({ from, to, presence })
  }

  if (samples.length === 0) {
    return [{ from: rangeStart, to: rangeEnd, presence: 'offline' }]
  }

  push(rangeStart, samples[0].ts, classify(samples[0].ts - rangeStart))

  for (let i = 1; i < samples.length; i += 1) {
    const gap = samples[i].ts - samples[i - 1].ts
    push(samples[i - 1].ts, samples[i].ts, classify(gap))
  }

  const last = samples[samples.length - 1]
  push(last.ts, rangeEnd, classify(rangeEnd - last.ts))

  return periods
}

export function uptimeRatio(periods: ConnectionPeriod[]): number {
  const total = periods.reduce((sum, p) => sum + (p.to - p.from), 0)
  if (total === 0) return 0
  const online = periods
    .filter((p) => p.presence === 'online')
    .reduce((sum, p) => sum + (p.to - p.from), 0)
  return online / total
}

export function outageCount(periods: ConnectionPeriod[]): number {
  return periods.filter((p) => p.presence === 'offline').length
}

export function lowestBattery(samples: TelemetrySample[]): number | null {
  const values = samples.map((s) => s.batteryPercent).filter((v): v is number => v != null)
  return values.length ? Math.min(...values) : null
}

export function splitOnGaps(
  samples: TelemetrySample[],
  stepMs: number
): TelemetrySample[][] {
  const breakAfter = Math.max(HEARTBEAT_MS * 3, stepMs * 2.5)
  const runs: TelemetrySample[][] = []
  let current: TelemetrySample[] = []

  for (const sample of samples) {
    const previous = current[current.length - 1]
    if (previous && sample.ts - previous.ts > breakAfter) {
      runs.push(current)
      current = []
    }
    current.push(sample)
  }
  if (current.length) runs.push(current)

  return runs
}

export function formatClock(ts: number, range: HistoryRange): string {
  const date = new Date(ts)
  if (range === '7d') {
    return date.toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit' })
  }
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
