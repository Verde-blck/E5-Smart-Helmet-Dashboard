import { useDevices } from '../hooks/useDevices'

export function SummaryCards() {
  const { devices } = useDevices()

  // Presence and alarm state are counted independently. Previously a helmet in
  // alarm was excluded from "Online now" because both lived in one enum, so a
  // connected fleet of 14 reported 13.
  const online = devices.filter((d) => d.presence === 'online').length
  const alarms = devices.filter((d) => d.activeAlarm !== null).length
  const lowBattery = devices.filter(
    (d) =>
      d.presence !== 'offline' &&
      d.telemetry.batteryPercent != null &&
      d.telemetry.batteryPercent < 20
  ).length

  const cards = [
    { label: 'Total devices', value: devices.length, color: 'text-slate-900' },
    { label: 'Online now', value: online, color: 'text-emerald-600' },
    { label: 'Active alarms', value: alarms, color: 'text-red-600' },
    { label: 'Low battery', value: lowBattery, color: 'text-amber-600' },
  ]

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{c.label}</p>
          <p className={`text-2xl font-semibold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  )
}
