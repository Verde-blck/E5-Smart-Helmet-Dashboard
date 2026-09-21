import { Link } from 'react-router-dom'
import { Can } from '@/shared/components/Can'
import { DataCard } from '@/shared/components/DataCard'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { useAlarms, useResolveAlarm } from '../hooks/useAlarms'
import { alarmLabel } from '../types'
import type { Alarm, AlarmSeverity, AlarmStatus } from '../types'

const SEVERITY_DOT: Record<AlarmSeverity, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-400',
}

const STATUS_STYLE: Record<AlarmStatus, string> = {
  active: 'bg-red-50 text-red-700 ring-red-200',
  resolved: 'bg-slate-50 text-slate-500 ring-slate-200',
}

const STATUS_LABEL: Record<AlarmStatus, string> = {
  active: 'Unresolved',
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
      {alarm.resolvedBy && alarm.status === 'resolved' && (
        <span className="ml-2 text-xs text-slate-400">by {alarm.resolvedBy}</span>
      )}
    </>
  )
}

function ResolveButton({ alarm, full }: { alarm: Alarm; full?: boolean }) {
  const resolve = useResolveAlarm()
  const resolved = alarm.status === 'resolved'

  return (
    <Can perm="alarms:write">
      <button
        onClick={() => resolve.mutate({ id: alarm.id, resolved: !resolved })}
        disabled={resolve.isPending}
        className={`rounded border border-slate-300 px-2 py-1 text-xs hover:bg-white disabled:opacity-50 ${
          resolved ? 'text-slate-500' : 'text-slate-700'
        } ${full ? 'w-full' : ''}`}
      >
        {/* Reopening matters: an alarm closed by mistake during an incident
            has to be recoverable without a database edit. */}
        {resolved ? 'Reopen' : 'Mark resolved'}
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
          ? 'No unresolved alarms.'
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
            action={<ResolveButton alarm={alarm} full />}
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
                  <ResolveButton alarm={alarm} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
