import { GAS_LEVEL_STYLE, evaluateAll, worstLevel } from '../lib/gas'
import type { GasStatus } from '../lib/gas'
import type { GasReading } from '@/shared/lib/api-normalize'

function GasCard({ status }: { status: GasStatus }) {
  const style = GAS_LEVEL_STYLE[status.level]
  const alarming = status.level === 'danger' || status.level === 'warning'

  return (
    <div
      className={`rounded-lg border p-3 ${
        status.level === 'danger'
          ? 'border-red-300 bg-red-50'
          : status.level === 'warning'
            ? 'border-amber-300 bg-amber-50'
            : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-xs text-slate-500">{status.gas}</span>
        {alarming && (
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} />
        )}
      </div>

      <p className={`mt-0.5 text-lg font-semibold ${style.text}`}>
        {status.value}
        <span className="ml-0.5 text-xs font-normal text-slate-400">{status.spec.unit}</span>
      </p>

      <p className="truncate text-[11px] text-slate-500" title={status.spec.label}>
        {status.spec.label}
      </p>

      {status.reason && (
        <p className={`mt-1 text-[11px] font-medium ${style.text}`}>{status.reason}</p>
      )}
    </div>
  )
}

export function GasPanel({
  readings,
  capturedAt,
}: {
  readings: GasReading[] | undefined
  capturedAt?: number
}) {
  const statuses = evaluateAll(readings)

  if (statuses.length === 0) {
    return (
      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
          Gas readings
        </h2>
        <p className="text-sm text-slate-500">
          This helmet hasn't reported any gas readings.
        </p>
      </section>
    )
  }

  const worst = worstLevel(statuses)
  const alarming = statuses.filter((s) => s.level === 'danger' || s.level === 'warning')

  return (
    <section
      className={`mt-4 rounded-lg border p-4 ${
        worst === 'danger'
          ? 'border-red-300 bg-red-50/40'
          : worst === 'warning'
            ? 'border-amber-300 bg-amber-50/40'
            : 'border-slate-200 bg-white'
      }`}
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Gas readings
        </h2>
        {alarming.length > 0 && (
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-medium ring-1 ${GAS_LEVEL_STYLE[worst].chip}`}
          >
            {alarming.map((s) => s.gas).join(', ')} out of range
          </span>
        )}
      </div>

      <p className="mb-3 text-[11px] text-slate-400">
        {/* A missing sensor and a reading of zero are very different things on
            a gas detector, so only fitted sensors appear here. */}
        Only sensors fitted to this helmet are shown. Thresholds are defaults
        and should be confirmed against your site's safety policy.
        {capturedAt && ` Last reading ${new Date(capturedAt).toLocaleTimeString()}.`}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {statuses.map((status) => (
          <GasCard key={status.gas} status={status} />
        ))}
      </div>
    </section>
  )
}
