import { useMemo, useState } from 'react'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { alarmLabel } from '@/modules/alarms/types'
import type { Alarm, AlarmType } from '@/modules/alarms/types'

const VIEW_W = 640
const VIEW_H = 170

type Window = 7 | 31

// One colour per series. Deliberately few: more than four lines on a chart
// this size is decoration, not information.
const SERIES_COLOURS = ['#dc2626', '#f59e0b', '#0f766e', '#6366f1']

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Alarms per day, split by type.
 *
 * The count on its own says how bad today is. The shape says whether it's a
 * bad day or a bad month — which is the difference between an incident and a
 * pattern worth investigating.
 */
export function AlarmFrequencyChart({ alarms }: { alarms: Alarm[] }) {
  const [days, setDays] = useState<Window>(7)
  const isWide = useMediaQuery('(min-width: 640px)')

  const { buckets, series, max } = useMemo(() => {
    const today = startOfDay(Date.now())
    const dayMs = 86_400_000
    const bucketStarts = Array.from({ length: days }, (_, i) => today - (days - 1 - i) * dayMs)

    const inWindow = alarms.filter((a) => a.raisedAt >= bucketStarts[0])

    // Only the types that actually occurred, most frequent first, capped at
    // four so the chart stays readable.
    const counts = new Map<AlarmType, number>()
    for (const alarm of inWindow) counts.set(alarm.type, (counts.get(alarm.type) ?? 0) + 1)
    const types = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([type]) => type)

    const built = types.map((type) => ({
      type,
      values: bucketStarts.map(
        (start) =>
          inWindow.filter((a) => a.type === type && startOfDay(a.raisedAt) === start).length
      ),
    }))

    const peak = Math.max(1, ...built.flatMap((s) => s.values))
    return { buckets: bucketStarts, series: built, max: peak }
  }, [alarms, days])

  const fontSize = isWide ? 9 : 14
  const padL = isWide ? 26 : 34
  const padR = 8
  const padT = 8
  const padB = isWide ? 20 : 28

  const x = (i: number) =>
    padL + (buckets.length === 1 ? 0 : (i / (buckets.length - 1)) * (VIEW_W - padL - padR))
  const y = (v: number) => padT + (1 - v / max) * (VIEW_H - padT - padB)

  const label = (ts: number) =>
    new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Alarm frequency
        </p>
        <div className="flex rounded-md border border-slate-200 p-0.5 text-xs">
          {([7, 31] as const).map((option) => (
            <button
              key={option}
              onClick={() => setDays(option)}
              className={`rounded px-2 py-0.5 ${
                days === option
                  ? 'bg-brand-primary/10 font-medium text-slate-900'
                  : 'text-slate-500'
              }`}
            >
              {option} days
            </button>
          ))}
        </div>
      </div>

      {series.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No alarms in the last {days} days.
        </p>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap gap-3">
            {series.map((s, i) => (
              <span key={s.type} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: SERIES_COLOURS[i] }}
                />
                {alarmLabel(s.type)}
              </span>
            ))}
          </div>

          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-auto w-full" role="img"
               aria-label={`Alarms per day over the last ${days} days`}>
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line
                  x1={padL}
                  x2={VIEW_W - padR}
                  y1={y(max * f)}
                  y2={y(max * f)}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <text x={0} y={y(max * f) + 3} fontSize={fontSize} fill="#94a3b8">
                  {Math.round(max * f)}
                </text>
              </g>
            ))}

            {series.map((s, i) => (
              <polyline
                key={s.type}
                fill="none"
                stroke={SERIES_COLOURS[i]}
                strokeWidth={isWide ? 1.75 : 2.5}
                strokeLinejoin="round"
                points={s.values.map((v, idx) => `${x(idx)},${y(v)}`).join(' ')}
              />
            ))}

            <text x={padL} y={VIEW_H - 5} fontSize={fontSize} fill="#94a3b8">
              {label(buckets[0])}
            </text>
            <text
              x={VIEW_W - padR}
              y={VIEW_H - 5}
              fontSize={fontSize}
              fill="#94a3b8"
              textAnchor="end"
            >
              {label(buckets[buckets.length - 1])}
            </text>
          </svg>
        </>
      )}
    </div>
  )
}
