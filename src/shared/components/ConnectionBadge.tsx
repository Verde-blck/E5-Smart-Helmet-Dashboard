import { useConnectionStore } from '@/shared/store/connectionStore'
import { features } from '@/config/features'
import { useDevices } from '@/modules/devices/hooks/useDevices'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { env } from '@/config/env'

const STYLES = {
  live: { dot: 'bg-emerald-500', text: 'text-slate-500', label: 'Live' },
  connecting: { dot: 'bg-amber-400 animate-pulse', text: 'text-amber-600', label: 'Connecting…' },
  reconnecting: {
    dot: 'bg-amber-400 animate-pulse',
    text: 'text-amber-600',
    label: 'Reconnecting…',
  },
  offline: { dot: 'bg-red-500', text: 'text-red-600', label: 'Disconnected' },
} as const

export function ConnectionBadge() {
  const state = useConnectionStore((s) => s.state)
  const { dataUpdatedAt, now, isError } = useDevices()

  // With no dashboard socket, "connected" means the last poll succeeded.
  // Showing when data last arrived is more honest than a green dot that only
  // means a socket is open.
  if (!features.realtimeSocket) {
    const stale = isError || (dataUpdatedAt > 0 && now - dataUpdatedAt > features.pollIntervalMs * 3)
    return (
      <span
        className={`flex items-center gap-1.5 text-xs ${stale ? 'text-red-600' : 'text-slate-500'}`}
        title={stale ? 'The last update failed — data may be stale' : 'Polling for updates'}
      >
        <span
          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${stale ? 'bg-red-500' : 'bg-emerald-500'}`}
        />
        <span className="hidden sm:inline">
          {dataUpdatedAt ? `Updated ${formatLastSeen(dataUpdatedAt, now)}` : 'Connecting…'}
        </span>
      </span>
    )
  }

  const style = STYLES[state]

  return (
    <span
      className={`flex items-center gap-1.5 text-xs ${style.text}`}
      title={
        state === 'live'
          ? 'Receiving live device events'
          : 'Device data may be stale until the connection is restored'
      }
    >
      <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
      {/* Dot only on narrow screens; the title attribute still carries the
          state, and the topbar has four other things competing for 375px. */}
      <span className="hidden sm:inline">{style.label}</span>
      {env.useMocks && state === 'live' && <span className="text-slate-400">(mock)</span>}
    </span>
  )
}
