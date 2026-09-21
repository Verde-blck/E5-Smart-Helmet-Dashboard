import { useDevices, useFleetSummary } from '../hooks/useDevices'
import { evaluateAll, worstLevel } from '../lib/gas'

interface Card {
  label: string
  value: number
  color: string
  /** Counted in the browser rather than reported by the backend. */
  derived?: boolean
}

export function SummaryCards() {
  const { devices } = useDevices()
  const { summary } = useFleetSummary()

  // Presence and alarm state are counted independently — a helmet in alarm is
  // still connected, and collapsing the two under-reported the fleet.
  const onlineLocal = devices.filter((d) => d.presence === 'online').length
  const inactiveLocal = devices.filter((d) => !d.active).length

  const lowBattery = devices.filter(
    (d) =>
      d.presence !== 'offline' &&
      d.telemetry.batteryPercent != null &&
      d.telemetry.batteryPercent < 20
  ).length

  // Only counted for helmets that actually carry sensors, so a fleet without
  // gas detection never shows the card at all.
  const gasReporting = devices.filter((d) => (d.telemetry.gas?.length ?? 0) > 0)
  const gasAlerts = gasReporting.filter((d) => {
    const worst = worstLevel(evaluateAll(d.telemetry.gas))
    return worst === 'danger' || worst === 'warning'
  }).length

  /**
   * The server's counts win where it provides them. It is the authority on
   * what "online" means, and its totals stay correct even if the device list
   * is ever paginated. Low battery and gas have no server-side equivalent, so
   * those are still counted here.
   */
  const cards: Card[] = [
    { label: 'Total devices', value: summary?.total ?? devices.length, color: 'text-slate-900' },
    { label: 'Online now', value: summary?.online ?? onlineLocal, color: 'text-emerald-600' },
    {
      label: 'Alarms (24h)',
      value: summary?.alarms24h ?? devices.filter((d) => d.activeAlarm !== null).length,
      color: 'text-red-600',
    },
    { label: 'Low battery', value: lowBattery, color: 'text-amber-600', derived: true },
    {
      label: 'Deactivated',
      value: summary?.inactive ?? inactiveLocal,
      color: 'text-slate-500',
    },
    ...(gasReporting.length > 0
      ? [{ label: 'Gas alerts', value: gasAlerts, color: 'text-red-600', derived: true }]
      : []),
  ]

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{c.label}</p>
          <p className={`text-2xl font-semibold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  )
}
