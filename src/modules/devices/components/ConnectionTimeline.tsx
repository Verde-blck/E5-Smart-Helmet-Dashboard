import { formatClock } from '../lib/history'
import type { ConnectionPeriod } from '../lib/history'
import type { HistoryRange, Presence } from '../types'

const FILL: Record<Presence, string> = {
  online: 'bg-emerald-500',
  degraded: 'bg-amber-400',
  offline: 'bg-slate-300',
}

const LABEL: Record<Presence, string> = {
  online: 'Online',
  degraded: 'Intermittent',
  offline: 'Offline',
}

function humanise(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

/**
 * One bar across the window, segmented by derived presence. Reads at a glance
 * as "was this helmet reachable during the shift", which is the question a
 * supervisor is actually asking when they open a device's history.
 */
export function ConnectionTimeline({
  periods,
  rangeStart,
  rangeEnd,
  range,
}: {
  periods: ConnectionPeriod[]
  rangeStart: number
  rangeEnd: number
  range: HistoryRange
}) {
  const span = Math.max(1, rangeEnd - rangeStart)

  return (
    <div>
      <div className="flex h-5 overflow-hidden rounded border border-slate-200">
        {periods.map((period, i) => (
          <div
            key={i}
            className={FILL[period.presence]}
            style={{ width: `${((period.to - period.from) / span) * 100}%` }}
            title={`${LABEL[period.presence]} · ${humanise(period.to - period.from)} · from ${formatClock(period.from, range)}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{formatClock(rangeStart, range)}</span>
        <span className="flex gap-3">
          {(['online', 'degraded', 'offline'] as const).map((presence) => (
            <span key={presence} className="flex items-center gap-1">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${FILL[presence]}`} />
              {LABEL[presence]}
            </span>
          ))}
        </span>
        <span>Now</span>
      </div>
    </div>
  )
}
