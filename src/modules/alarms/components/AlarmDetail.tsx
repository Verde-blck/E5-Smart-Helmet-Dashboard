import { useEffect } from 'react'
import { isSos } from '../types'
import { Link } from 'react-router-dom'
import { SosCallButton } from '@/modules/live/components/SosCallButton'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { useResolveAlarm } from '../hooks/useAlarms'
import { alarmLabel } from '../types'
import type { Alarm } from '../types'
import { AlarmFootage } from './AlarmFootage'
import { AlarmLocationMap } from './AlarmLocationMap'

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Everything about one alarm in a side panel: what happened, when, where,
 * and the footage from that helmet around that moment.
 */
export function AlarmDetail({ alarm, now, onClose }: { alarm: Alarm; now: number; onClose: () => void }) {
  const resolve = useResolveAlarm()
  const resolved = alarm.status === 'resolved'
  const hasLocation = alarm.lat != null && alarm.lng != null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // The media viewer handles its own Escape; only close the panel when
      // nothing is open on top of it.
      if (e.key === 'Escape' && !document.querySelector('[data-media-viewer]')) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={`Alarm: ${alarmLabel(alarm.type)}`}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-900/30" />
      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${alarm.severity === 'critical' ? 'bg-red-500' : 'bg-amber-400'}`}
                aria-hidden="true"
              />
              <h2 className="text-base font-semibold text-slate-900">{alarmLabel(alarm.type)}</h2>
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                  resolved ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-700'
                }`}
              >
                {resolved ? 'Resolved' : 'Unresolved'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatWhen(alarm.raisedAt)} · {formatLastSeen(alarm.raisedAt, now)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            Close
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-slate-500">Helmet</dt>
            <dd>
              <Link to={`/devices/${alarm.deviceId}`} className="font-medium text-slate-800 underline-offset-2 hover:underline">
                {alarm.deviceName}
              </Link>
              <span className="block font-mono text-[11px] text-slate-400">{alarm.deviceId}</span>
            </dd>
            {alarm.site && (
              <>
                <dt className="text-slate-500">Site</dt>
                <dd className="text-slate-800">{alarm.site}</dd>
              </>
            )}
            {resolved && (
              <>
                <dt className="text-slate-500">Resolved</dt>
                <dd className="text-slate-800">
                  {alarm.resolvedAt ? formatWhen(alarm.resolvedAt) : 'Yes'}
                  {alarm.resolvedBy && ` by ${alarm.resolvedBy}`}
                </dd>
              </>
            )}
            {alarm.note && (
              <>
                <dt className="text-slate-500">Note</dt>
                <dd className="text-slate-800">{alarm.note}</dd>
              </>
            )}
          </dl>

          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Location</h3>
            {hasLocation ? (
              <>
                <AlarmLocationMap lat={alarm.lat as number} lng={alarm.lng as number} />
                <p className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-mono">
                    {(alarm.lat as number).toFixed(6)}, {(alarm.lng as number).toFixed(6)}
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${alarm.lat},${alarm.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-brand-primary hover:underline"
                  >
                    Open in Google Maps
                  </a>
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">No location was reported with this alarm.</p>
            )}
          </section>

          <AlarmFootage alarm={alarm} now={now} />
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
          {isSos(alarm.type) && !resolved && (
            <SosCallButton deviceId={alarm.deviceId} deviceName={alarm.deviceName} />
          )}
          <button
            onClick={() => resolve.mutate({ id: alarm.id, resolved: !resolved })}
            disabled={resolve.isPending}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {resolve.isPending ? 'Saving…' : resolved ? 'Reopen' : 'Mark resolved'}
          </button>
        </footer>
      </aside>
    </div>
  )
}
