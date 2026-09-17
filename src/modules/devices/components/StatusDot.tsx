import type { Presence } from '../types'

const COLORS: Record<Presence, string> = {
  online: 'bg-emerald-500',
  degraded: 'bg-amber-400',
  offline: 'bg-slate-300',
}

const LABELS: Record<Presence, string> = {
  online: 'Online',
  degraded: 'Intermittent',
  offline: 'Offline',
}

export function StatusDot({ presence }: { presence: Presence }) {
  return (
    <span
      title={LABELS[presence]}
      aria-label={LABELS[presence]}
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${COLORS[presence]}`}
    />
  )
}

export function AlarmBadge({ severity }: { severity: 'critical' | 'warning' }) {
  const tone =
    severity === 'critical'
      ? 'bg-red-50 text-red-700 ring-red-200'
      : 'bg-amber-50 text-amber-700 ring-amber-200'
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ${tone}`}>
      {severity === 'critical' ? 'Alarm' : 'Warning'}
    </span>
  )
}
