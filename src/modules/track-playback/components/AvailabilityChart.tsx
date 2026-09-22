import { useState } from 'react'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { formatUptime } from '../lib/availability'
import type { AvailabilitySummary } from '../lib/availability'

const VIEW_W = 660
const VIEW_H = 190

function dayLabel(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/**
 * Uptime rather than location — the question the reference platform's Track
 * Playback actually answers: was this helmet switched on and reporting?
 *
 * It sits alongside the route rather than replacing it, because the two
 * answer different questions: the route is for incidents, this is for
 * compliance and payroll.
 */
export function AvailabilityChart({ summary }: { summary: AvailabilitySummary }) {
  const isWide = useMediaQuery('(min-width: 640px)')
  const [hover, setHover] = useState<number | null>(null)

  const { days } = summary
  if (days.length === 0) return null

  const fontSize = isWide ? 9 : 14
  const padL = isWide ? 30 : 40
  const padR = 8
  const padT = 10
  const padB = isWide ? 22 : 30

  const peakMs = Math.max(...days.map((d) => d.availableMs), 60_000)
  // Round the axis up to a whole hour so the gridline labels are readable.
  const axisMax = Math.ceil(peakMs / 3_600_000) * 3_600_000

  const plotW = VIEW_W - padL - padR
  const plotH = VIEW_H - padT - padB
  const slot = plotW / days.length
  const barW = Math.max(2, Math.min(slot * 0.6, 22))

  const x = (i: number) => padL + i * slot + (slot - barW) / 2
  const y = (ms: number) => padT + (1 - ms / axisMax) * plotH

  const uptimeRatio = summary.rangeMs > 0 ? summary.totalAvailableMs / summary.rangeMs : 0
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const ringTone = uptimeRatio >= 0.5 ? '#10b981' : uptimeRatio >= 0.2 ? '#f59e0b' : '#ef4444'

  const hovered = hover != null ? days[hover] : null

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Available online
        </h2>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="inline-block h-2 w-2 rounded-sm bg-brand-primary" />
          Reporting time per day
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="relative">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="h-auto w-full"
            role="img"
            aria-label="Time online per day over the selected period"
            onMouseLeave={() => setHover(null)}
          >
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line
                  x1={padL}
                  x2={VIEW_W - padR}
                  y1={y(axisMax * f)}
                  y2={y(axisMax * f)}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <text x={0} y={y(axisMax * f) + 3} fontSize={fontSize} fill="#94a3b8">
                  {formatUptime(axisMax * f)}
                </text>
              </g>
            ))}

            {days.map((day, i) => (
              <g key={day.dayStart}>
                {/* Full-height hit area, so a zero-minute day is still
                    hoverable — that's often the day you want to ask about. */}
                <rect
                  x={padL + i * slot}
                  y={padT}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
                <rect
                  x={x(i)}
                  y={y(day.availableMs)}
                  width={barW}
                  height={Math.max(day.availableMs > 0 ? 1.5 : 0, plotH - (y(day.availableMs) - padT))}
                  rx={1.5}
                  fill="rgb(var(--brand-primary))"
                  opacity={hover === null || hover === i ? 0.9 : 0.35}
                />
              </g>
            ))}

            <text x={padL} y={VIEW_H - 5} fontSize={fontSize} fill="#94a3b8">
              {dayLabel(days[0].dayStart)}
            </text>
            <text
              x={VIEW_W - padR}
              y={VIEW_H - 5}
              fontSize={fontSize}
              fill="#94a3b8"
              textAnchor="end"
            >
              {dayLabel(days[days.length - 1].dayStart)}
            </text>
          </svg>

          {hovered && (
            <div className="pointer-events-none absolute right-2 top-2 rounded bg-slate-900/85 px-2 py-1 text-[11px] text-white">
              <span className="block">{new Date(hovered.dayStart).toLocaleDateString()}</span>
              <span className="block">Available online: {formatUptime(hovered.availableMs)}</span>
              <span className="block text-slate-300">{hovered.sampleCount} reports</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 sm:flex-col sm:gap-1">
          <svg viewBox="0 0 84 84" className="h-20 w-20 shrink-0 -rotate-90">
            <circle cx="42" cy="42" r={radius} fill="none" stroke="#e2e8f0" strokeWidth={8} />
            <circle
              cx="42"
              cy="42"
              r={radius}
              fill="none"
              stroke={ringTone}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - Math.min(1, uptimeRatio))}
            />
          </svg>
          <div className="sm:text-center">
            <p className="text-lg font-semibold text-slate-900">
              {formatUptime(summary.totalAvailableMs)}
            </p>
            <p className="text-[11px] text-slate-500">
              {Math.round(uptimeRatio * 100)}% of the period
            </p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-400">
        {/* The tolerance is derived, so it's worth saying what it landed on —
            a helmet on a long BEATTIM isn't penalised for reporting rarely. */}
        Counted from the spacing between reports, which arrive roughly every{' '}
        {Math.round(summary.medianIntervalMs / 1000)}s on this helmet. A silence
        longer than {Math.round(summary.toleranceMs / 60_000)} min counts as offline.
      </p>
    </div>
  )
}
