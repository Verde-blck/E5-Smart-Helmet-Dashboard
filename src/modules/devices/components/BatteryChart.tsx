import { useRef, useState } from 'react'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { formatClock, splitOnGaps } from '../lib/history'
import type { TelemetrySample, TelemetryWindow } from '../types'

const VIEW_W = 600
const VIEW_H = 150
const LOW_BATTERY = 20

/**
 * Hand-rolled SVG rather than a charting library. At this scale a line, four
 * gridlines and a readout is about eighty lines of code, and it avoids adding
 * ~100KB to a bundle that supervisors may load over a site's mobile
 * connection. If this ever needs brushing, zoom or stacked series, that's the
 * point to reach for Recharts.
 */
export function BatteryChart({ window: win }: { window: TelemetryWindow }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverTs, setHoverTs] = useState<number | null>(null)
  const isWide = useMediaQuery('(min-width: 640px)')

  // The SVG scales to its container, so a 600-unit viewBox shrinks to roughly
  // 340px on a phone — 9px axis labels land at about 5px. Scale the type and
  // padding up in viewBox units so they come out legible after the squeeze.
  const fontSize = isWide ? 9 : 15
  const padL = isWide ? 28 : 40
  const padR = isWide ? 8 : 10
  const padT = 8
  const padB = isWide ? 18 : 26

  const { samples, rangeStart, rangeEnd, range } = win
  const span = Math.max(1, rangeEnd - rangeStart)

  const x = (ts: number) => padL + ((ts - rangeStart) / span) * (VIEW_W - padL - padR)
  const y = (pct: number) => padT + (1 - pct / 100) * (VIEW_H - padT - padB)

  const runs = splitOnGaps(
    samples.filter((s) => s.batteryPercent != null),
    win.stepMs
  )

  const hovered =
    hoverTs == null
      ? null
      : samples.reduce<TelemetrySample | null>((closest, sample) => {
          if (sample.batteryPercent == null) return closest
          if (!closest) return sample
          return Math.abs(sample.ts - hoverTs) < Math.abs(closest.ts - hoverTs)
            ? sample
            : closest
        }, null)

  function inspectAt(clientX: number) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    // Map client pixels back into viewBox units before converting to a time.
    const viewX = ((clientX - rect.left) / rect.width) * VIEW_W
    const ratio = (viewX - padL) / (VIEW_W - padL - padR)
    setHoverTs(rangeStart + Math.min(1, Math.max(0, ratio)) * span)
  }

  if (runs.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
        No battery readings in this period.
      </p>
    )
  }

  return (
    <div className="relative rounded-lg border border-slate-200 bg-white p-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full touch-none"
        onMouseMove={(e) => inspectAt(e.clientX)}
        onMouseLeave={() => setHoverTs(null)}
        // Touch devices have no hover, so drag-to-inspect stands in. The
        // readout stays put on release rather than vanishing the instant a
        // finger lifts, which would make it unreadable.
        onTouchStart={(e) => inspectAt(e.touches[0].clientX)}
        onTouchMove={(e) => inspectAt(e.touches[0].clientX)}
        role="img"
        aria-label="Battery level over the selected period"
      >
        {[0, 25, 50, 75, 100].map((pct) => (
          <g key={pct}>
            <line
              x1={padL}
              x2={VIEW_W - padR}
              y1={y(pct)}
              y2={y(pct)}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text x={0} y={y(pct) + fontSize / 3} fontSize={fontSize} fill="#94a3b8">
              {pct}
            </text>
          </g>
        ))}

        <line
          x1={padL}
          x2={VIEW_W - padR}
          y1={y(LOW_BATTERY)}
          y2={y(LOW_BATTERY)}
          stroke="#f59e0b"
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        {runs.map((run, i) => (
          <polyline
            key={i}
            fill="none"
            stroke="rgb(var(--brand-primary))"
            strokeWidth={isWide ? 1.75 : 2.5}
            strokeLinejoin="round"
            points={run.map((s) => `${x(s.ts)},${y(s.batteryPercent as number)}`).join(' ')}
          />
        ))}

        {hovered?.batteryPercent != null && (
          <g>
            <line
              x1={x(hovered.ts)}
              x2={x(hovered.ts)}
              y1={padT}
              y2={VIEW_H - padB}
              stroke="#94a3b8"
              strokeWidth={1}
            />
            <circle
              cx={x(hovered.ts)}
              cy={y(hovered.batteryPercent)}
              r={isWide ? 3 : 4.5}
              fill="rgb(var(--brand-primary))"
            />
          </g>
        )}

        <text x={padL} y={VIEW_H - 4} fontSize={fontSize} fill="#94a3b8">
          {formatClock(rangeStart, range)}
        </text>
        <text
          x={VIEW_W - padR}
          y={VIEW_H - 4}
          fontSize={fontSize}
          fill="#94a3b8"
          textAnchor="end"
        >
          Now
        </text>
      </svg>

      {hovered?.batteryPercent != null && (
        <div className="pointer-events-none absolute right-3 top-3 rounded bg-slate-900/85 px-2 py-1 text-[11px] text-white">
          {hovered.batteryPercent}% · {formatClock(hovered.ts, range)}
          {hovered.connectivity && ` · ${hovered.connectivity.toUpperCase()}`}
        </div>
      )}
    </div>
  )
}
