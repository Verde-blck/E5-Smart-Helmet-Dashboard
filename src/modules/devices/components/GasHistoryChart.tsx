import { useMemo, useState } from 'react'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { GAS_SPECS } from '../lib/gas'
import { formatClock } from '../lib/history'
import type { HistoryRange, TelemetrySample } from '../types'

const VIEW_W = 600
const VIEW_H = 150

/**
 * Exposure over time for one gas.
 *
 * A single current reading tells an operator whether it's safe right now. The
 * trend tells them whether it's getting worse, which is the thing that decides
 * whether someone should be pulled out.
 */
export function GasHistoryChart({
  samples,
  rangeStart,
  rangeEnd,
  range,
}: {
  samples: TelemetrySample[]
  rangeStart: number
  rangeEnd: number
  range: HistoryRange
}) {
  const isWide = useMediaQuery('(min-width: 640px)')

  // Only gases this helmet actually reported over the window.
  const available = useMemo(() => {
    const seen = new Set<string>()
    for (const sample of samples) {
      for (const reading of sample.gas ?? []) seen.add(reading.gas)
    }
    return [...seen].sort()
  }, [samples])

  const [selected, setSelected] = useState<string | null>(null)
  const gas = selected && available.includes(selected) ? selected : available[0]

  const points = useMemo(() => {
    if (!gas) return []
    return samples
      .map((sample) => {
        const reading = sample.gas?.find((r) => r.gas === gas)
        return reading ? { ts: sample.ts, value: reading.value } : null
      })
      .filter((p): p is { ts: number; value: number } => p !== null)
  }, [samples, gas])

  if (!gas || points.length === 0) return null

  const spec = GAS_SPECS[gas] ?? { label: gas, unit: '' }
  const fontSize = isWide ? 9 : 15
  const padL = isWide ? 34 : 46
  const padR = isWide ? 8 : 10
  const padT = 8
  const padB = isWide ? 18 : 26

  // Include the thresholds in the scale, or a line sitting outside the data
  // range would be clipped off the chart and the reading would look safe.
  const candidates = [
    ...points.map((p) => p.value),
    spec.warnAbove,
    spec.dangerAbove,
    spec.warnBelow,
    spec.dangerBelow,
  ].filter((v): v is number => v !== undefined)

  const rawMin = Math.min(...candidates)
  const rawMax = Math.max(...candidates)
  const pad = (rawMax - rawMin) * 0.1 || 1
  const min = rawMin - pad
  const max = rawMax + pad
  const span = Math.max(1, rangeEnd - rangeStart)

  const x = (t: number) => padL + ((t - rangeStart) / span) * (VIEW_W - padL - padR)
  const y = (v: number) =>
    padT + (1 - (v - min) / (max - min || 1)) * (VIEW_H - padT - padB)

  const threshold = (value: number | undefined, colour: string, label: string) =>
    value === undefined ? null : (
      <g key={label}>
        <line
          x1={padL}
          x2={VIEW_W - padR}
          y1={y(value)}
          y2={y(value)}
          stroke={colour}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text x={VIEW_W - padR} y={y(value) - 3} fontSize={fontSize} fill={colour} textAnchor="end">
          {label}
        </text>
      </g>
    )

  return (
    <div className="mt-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Exposure over time</span>
        <div className="flex flex-wrap gap-1">
          {available.map((option) => (
            <button
              key={option}
              onClick={() => setSelected(option)}
              className={`rounded px-2 py-0.5 font-mono text-[11px] ${
                option === gas
                  ? 'bg-brand-primary/10 font-medium text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-2">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`${spec.label} over the selected period`}
        >
          {threshold(spec.dangerAbove, '#dc2626', 'danger')}
          {threshold(spec.warnAbove, '#f59e0b', 'warn')}
          {threshold(spec.warnBelow, '#f59e0b', 'warn')}
          {threshold(spec.dangerBelow, '#dc2626', 'danger')}

          <polyline
            fill="none"
            stroke="rgb(var(--brand-primary))"
            strokeWidth={isWide ? 1.75 : 2.5}
            strokeLinejoin="round"
            points={points.map((p) => `${x(p.ts)},${y(p.value)}`).join(' ')}
          />

          <text x={0} y={padT + fontSize} fontSize={fontSize} fill="#94a3b8">
            {max.toFixed(1)}
          </text>
          <text x={0} y={VIEW_H - padB} fontSize={fontSize} fill="#94a3b8">
            {min.toFixed(1)}
          </text>
          <text x={padL} y={VIEW_H - 4} fontSize={fontSize} fill="#94a3b8">
            {formatClock(rangeStart, range)}
          </text>
          <text x={VIEW_W - padR} y={VIEW_H - 4} fontSize={fontSize} fill="#94a3b8" textAnchor="end">
            Now
          </text>
        </svg>
      </div>

      <p className="mt-1 text-[11px] text-slate-400">
        {spec.label} in {spec.unit || 'reported units'}
        {spec.note && ` · ${spec.note}`}
      </p>
    </div>
  )
}
