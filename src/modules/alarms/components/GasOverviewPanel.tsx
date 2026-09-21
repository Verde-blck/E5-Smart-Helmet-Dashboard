import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GAS_LEVEL_STYLE, evaluateAll, worstLevel } from '@/modules/devices/lib/gas'
import { GasHistoryChart } from '@/modules/devices/components/GasHistoryChart'
import { useDevices } from '@/modules/devices/hooks/useDevices'
import { useDeviceHistory } from '@/modules/devices/hooks/useDeviceHistory'

const RANK = { danger: 0, warning: 1, normal: 2, unknown: 3 } as const

/**
 * Gas belongs on the alarm page as well as the device page.
 *
 * A gas reading climbing towards its threshold is the alarm that hasn't
 * fired yet — it's the one an operator wants to see while there's still time
 * to act, rather than afterwards in the event log.
 */
export function GasOverviewPanel() {
  const { devices } = useDevices()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const withSensors = devices
    .filter((d) => (d.telemetry.gas?.length ?? 0) > 0)
    .map((d) => ({ device: d, statuses: evaluateAll(d.telemetry.gas) }))
    .sort(
      (a, b) => RANK[worstLevel(a.statuses)] - RANK[worstLevel(b.statuses)]
    )

  // Nothing on this fleet carries gas sensors — say nothing rather than show
  // an empty panel on every alarm page.
  if (withSensors.length === 0) return null

  const selected = selectedId
    ? withSensors.find((w) => w.device.id === selectedId)
    : withSensors[0]

  return (
    <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Gas exposure
        </h2>
        <span className="text-[11px] text-slate-400">
          {withSensors.length} {withSensors.length === 1 ? 'helmet' : 'helmets'} with sensors
          · worst first
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {withSensors.map(({ device, statuses }) => {
          const level = worstLevel(statuses)
          const isSelected = selected?.device.id === device.id
          const flagged = statuses.filter((s) => s.level === level)

          return (
            <button
              key={device.id}
              onClick={() => setSelectedId(device.id)}
              className={`rounded-md border px-2.5 py-1.5 text-left text-xs ${
                isSelected ? 'border-brand-primary/50 bg-brand-primary/5' : 'border-slate-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${GAS_LEVEL_STYLE[level].dot}`}
                />
                <span className="font-medium text-slate-800">{device.name}</span>
              </span>
              <span className={`mt-0.5 block ${GAS_LEVEL_STYLE[level].text}`}>
                {level === 'danger' || level === 'warning'
                  ? flagged.map((s) => `${s.gas} ${s.value}${s.spec.unit}`).join(' · ')
                  : 'Within range'}
              </span>
            </button>
          )
        })}
      </div>

      {selected && <SelectedGasHistory deviceId={selected.device.id} />}

      {selected && (
        <Link
          to={`/devices/${selected.device.id}`}
          className="mt-2 inline-block text-xs text-slate-500 hover:text-slate-800"
        >
          Open {selected.device.name} →
        </Link>
      )}
    </section>
  )
}

function SelectedGasHistory({ deviceId }: { deviceId: string }) {
  // One hour keeps the request small; the device page carries the longer
  // windows for anyone investigating after the fact.
  const { window: win, isLoading } = useDeviceHistory(deviceId, '1h')

  if (isLoading) return <p className="text-xs text-slate-500">Loading exposure…</p>
  if (!win || win.samples.length === 0) {
    return <p className="text-xs text-slate-500">No readings in the last hour.</p>
  }

  return (
    <GasHistoryChart
      samples={win.samples}
      rangeStart={win.rangeStart}
      rangeEnd={win.rangeEnd}
      range={win.range}
    />
  )
}
