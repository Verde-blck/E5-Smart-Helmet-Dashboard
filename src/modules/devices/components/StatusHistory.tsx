import { useState } from 'react'
import { useDeviceHistory } from '../hooks/useDeviceHistory'
import { HISTORY_RANGES } from '../lib/history'
import { BatteryChart } from './BatteryChart'
import { ConnectionTimeline } from './ConnectionTimeline'
import type { HistoryRange } from '../types'

const RANGES: HistoryRange[] = ['1h', '24h', '7d']

function Stat({ label, value, tone = 'text-slate-800' }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`text-sm font-medium ${tone}`}>{value}</p>
    </div>
  )
}

export function StatusHistory({ deviceId }: { deviceId: string }) {
  const [range, setRange] = useState<HistoryRange>('24h')
  const { window: win, derived, isLoading, isError } = useDeviceHistory(deviceId, range)

  const uptimePct = derived ? Math.round(derived.uptime * 100) : null

  return (
    <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Status history
        </h2>
        <div className="flex rounded-md border border-slate-200 p-0.5 text-xs">
          {RANGES.map((option) => (
            <button
              key={option}
              onClick={() => setRange(option)}
              className={`rounded px-2 py-0.5 ${
                range === option
                  ? 'bg-brand-primary/10 font-medium text-slate-900'
                  : 'text-slate-500'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading history…</p>}
      {isError && <p className="text-sm text-red-600">Failed to load history.</p>}

      {win && derived && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label="Reachable"
              value={`${uptimePct}%`}
              tone={
                uptimePct != null && uptimePct < 80 ? 'text-amber-600' : 'text-emerald-600'
              }
            />
            <Stat
              label="Outages"
              value={String(derived.outages)}
              tone={derived.outages > 0 ? 'text-amber-600' : 'text-slate-800'}
            />
            <Stat
              label="Lowest battery"
              value={derived.minBattery != null ? `${derived.minBattery}%` : '—'}
              tone={
                derived.minBattery != null && derived.minBattery < 20
                  ? 'text-red-600'
                  : 'text-slate-800'
              }
            />
            <Stat label="Readings" value={String(win.samples.length)} />
          </div>

          <div className="mb-4">
            <ConnectionTimeline
              periods={derived.periods}
              rangeStart={win.rangeStart}
              rangeEnd={win.rangeEnd}
              range={win.range}
            />
          </div>

          <BatteryChart window={win} />

          <p className="mt-2 text-[11px] text-slate-400">
            {HISTORY_RANGES[range].label} · one reading per{' '}
            {win.stepMs >= 60_000 ? `${win.stepMs / 60_000} min` : `${win.stepMs / 1000}s`}.
            Gaps shorter than the sampling interval aren't visible at this range.
          </p>
        </>
      )}
    </section>
  )
}
