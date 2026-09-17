import { Link } from 'react-router-dom'
import { Can } from '@/shared/components/Can'
import { DataCard } from '@/shared/components/DataCard'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { useAcknowledgeAlarm, useAlarms } from '../hooks/useAlarms'
import { alarmLabel } from '../types'
import type { Alarm, AlarmSeverity, AlarmStatus } from '../types'

const SEVERITY_DOT: Record<AlarmSeverity, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-400',
}

const STATUS_STYLE: Record<AlarmStatus, string> = {
  active: 'bg-red-50 text-red-700 ring-red-200',
  acknowledged: 'bg-amber-50 text-amber-700 ring-amber-200',
  resolved: 'bg-slate-50 text-slate-500 ring-slate-200',
}

const STATUS_LABEL: Record<AlarmStatus, string> = {
  active: 'Active',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
}

function StatusChip({ alarm }: { alarm: Alarm }) {
  return (
    <>
      <span
        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ${STATUS_STYLE[alarm.status]}`}
      >
        {STATUS_LABEL[alarm.status]}
      </span>
      {alarm.acknowledgedBy && alarm.status !== 'active' && (
        <span className="ml-2 text-xs text-slate-400">by {alarm.acknowledgedBy}</span>
      )}
    </>
  )
}

function AcknowledgeButton({ alarm, full }: { alarm: Alarm; full?: boolean }) {
  const acknowledge = useAcknowledgeAlarm()
  if (alarm.status !== 'active') return null

  return (
    <Can perm="alarms:write">
      <button
        onClick={() => acknowledge.mutate(alarm.id)}
        disabled={acknowledge.isPending}
        className={`rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-white disabled:opacity-50 ${
          full ? 'w-full' : ''
        }`}
      >
        Acknowledge
      </button>
    </Can>
  )
}

function AlarmTitle({ alarm }: { alarm: Alarm }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[alarm.severity]}`}
        aria-label={alarm.severity}
      />
      <span className="text-sm font-medium text-slate-800">{alarmLabel(alarm.type)}</span>
    </span>
  )
}

export function AlarmFeed({
  activeOnly = false,
  deviceId,
  limit,
}: {
  activeOnly?: boolean
  deviceId?: string
  limit?: number
}) {
  const { alarms, active, now, isLoading, isError } = useAlarms()
  const base = activeOnly ? active : alarms
  const scoped = deviceId ? base.filter((a) => a.deviceId === deviceId) : base
  const rows = limit ? scoped.slice(0, limit) : scoped

  if (isLoading) return <p className="text-sm text-slate-500">Loading alarms…</p>
  if (isError) return <p className="text-sm text-red-600">Failed to load alarms.</p>
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
        {activeOnly
          ? 'No active alarms.'
          : deviceId
            ? 'No alarm events for this helmet.'
            : 'No alarm events recorded yet.'}
      </p>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map((alarm) => (
          <DataCard
            key={alarm.id}
            title={<AlarmTitle alarm={alarm} />}
            badges={<StatusChip alarm={alarm} />}
            rows={[
              {
                label: 'Device',
                value: (
                  <Link to={`/devices/${alarm.deviceId}`} className="underline-offset-2 hover:underline">
                    {alarm.deviceName}
                  </Link>
                ),
              },
              { label: 'Raised', value: formatLastSeen(alarm.raisedAt, now) },
              ...(alarm.note ? [{ label: 'Note', value: alarm.note }] : []),
            ]}
            action={<AcknowledgeButton alarm={alarm} full />}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Event</th>
              <th className="px-4 py-2 font-medium">Device</th>
              <th className="px-4 py-2 font-medium">Raised</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((alarm) => (
              <tr key={alarm.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <AlarmTitle alarm={alarm} />
                  {alarm.note && (
                    <p className="mt-0.5 pl-4 text-xs text-slate-400">{alarm.note}</p>
                  )}
                </td>
                <td className="px-4 py-2">
                  <Link
                    to={`/devices/${alarm.deviceId}`}
                    className="text-slate-600 underline-offset-2 hover:underline"
                  >
                    {alarm.deviceName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {formatLastSeen(alarm.raisedAt, now)}
                </td>
                <td className="px-4 py-2">
                  <StatusChip alarm={alarm} />
                </td>
                <td className="px-4 py-2 text-right">
                  <AcknowledgeButton alarm={alarm} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
