import { Link } from 'react-router-dom'
import { BroadcastButton } from '@/modules/messaging/components/BroadcastButton'
import { GAS_LEVEL_STYLE, evaluateAll, worstLevel } from '../lib/gas'
import { formatLastSeen } from '../lib/presence'
import type { DeviceView, Presence } from '../types'

const SHELL: Record<Presence, string> = {
  online: 'text-emerald-500',
  degraded: 'text-amber-400',
  offline: 'text-slate-300',
}

const PRESENCE_LABEL: Record<Presence, string> = {
  online: 'Online',
  degraded: 'Intermittent',
  offline: 'Offline',
}

/**
 * Drawn rather than photographed.
 *
 * The vendor's console shows a photo of a helmet in each tile, which looks
 * the part but carries no information — every tile is identical. An outline
 * that takes the device's own status as its colour says the same thing and
 * also tells you which helmet is in trouble from across the room.
 */
function HelmetGlyph({ presence, className }: { presence: Presence; className?: string }) {
  return (
    <svg viewBox="0 0 96 64" className={className} aria-hidden="true">
      <path
        d="M8 50a40 40 0 0 1 80 0Z"
        className={`${SHELL[presence]} fill-current opacity-20`}
      />
      <path
        d="M8 50a40 40 0 0 1 80 0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        className={SHELL[presence]}
      />
      {/* Brim */}
      <line
        x1="4"
        y1="50"
        x2="92"
        y2="50"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        className={SHELL[presence]}
      />
      {/* Crown ribs */}
      <path
        d="M34 18v32M62 18v32"
        stroke="currentColor"
        strokeWidth={1.5}
        className={`${SHELL[presence]} opacity-50`}
      />
      {/* Camera housing — this is a body-worn camera helmet */}
      <rect
        x="70"
        y="36"
        width="12"
        height="9"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className={SHELL[presence]}
      />
    </svg>
  )
}

export function HelmetTile({ device, now }: { device: DeviceView; now: number }) {
  const gas = evaluateAll(device.telemetry.gas)
  const gasLevel = worstLevel(gas)
  const gasAlarming = gasLevel === 'danger' || gasLevel === 'warning'
  const battery = device.telemetry.batteryPercent

  return (
    <Link
      to={`/devices/${device.id}`}
      className={`group relative flex flex-col rounded-lg border bg-white p-3 transition hover:shadow-sm ${
        device.activeAlarm || gasLevel === 'danger'
          ? 'border-red-300'
          : gasLevel === 'warning'
            ? 'border-amber-300'
            : 'border-slate-200'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="truncate text-sm font-medium text-slate-800">{device.name}</span>
        <span className="flex shrink-0 items-center gap-1">
          {!device.active && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
              Inactive
            </span>
          )}
          <BroadcastButton deviceId={device.id} deviceName={device.name} />
        </span>
      </div>

      <HelmetGlyph presence={device.presence} className="mx-auto h-16 w-auto" />

      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5 text-slate-500">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              device.presence === 'online'
                ? 'bg-emerald-500'
                : device.presence === 'degraded'
                  ? 'bg-amber-400'
                  : 'bg-slate-300'
            }`}
          />
          {PRESENCE_LABEL[device.presence]}
        </span>
        <span className="text-slate-500">{battery != null ? `${battery}%` : '—'}</span>
      </div>

      <p className="mt-0.5 text-[11px] text-slate-400">
        {device.lastSeenAt ? formatLastSeen(device.lastSeenAt, now) : 'Never reported'}
      </p>

      <div className="mt-1.5 flex flex-wrap gap-1">
        {device.activeAlarm && (
          <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
            ALARM
          </span>
        )}
        {gasAlarming && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${GAS_LEVEL_STYLE[gasLevel].chip}`}
          >
            {gas.filter((g) => g.level === gasLevel).map((g) => g.gas).join(', ')}
          </span>
        )}
        {device.telemetry.isRecording && (
          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-red-600">REC</span>
        )}
      </div>
    </Link>
  )
}
