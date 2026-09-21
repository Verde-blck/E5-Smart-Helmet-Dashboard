/**
 * The headline number, as a ring rather than a digit.
 *
 * "9" on its own means nothing without the fleet size beside it; the arc
 * carries the proportion at a glance, which is what a wall-mounted overview
 * is actually for.
 */
export function OnlineGauge({ online, total }: { online: number; total: number }) {
  const ratio = total > 0 ? online / total : 0
  const radius = 42
  const circumference = 2 * Math.PI * radius

  // Under half the fleet reporting is worth noticing from across a room.
  const tone = ratio >= 0.8 ? '#10b981' : ratio >= 0.5 ? '#f59e0b' : '#ef4444'

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">Helmets online</p>

      <div className="mt-2 flex items-center gap-4">
        <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0 -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth={9} />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={tone}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ratio)}
          />
        </svg>

        <div>
          <p className="text-3xl font-semibold text-slate-900">
            {online}
            <span className="text-base font-normal text-slate-400"> / {total}</span>
          </p>
          <p className="text-xs text-slate-500">
            {total === 0
              ? 'No helmets registered'
              : `${Math.round(ratio * 100)}% of the fleet reporting`}
          </p>
        </div>
      </div>
    </div>
  )
}
