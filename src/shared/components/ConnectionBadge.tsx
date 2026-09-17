import { useConnectionStore } from '@/shared/store/connectionStore'
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
