import { Link } from 'react-router-dom'

export interface DataCardRow {
  label: string
  value: React.ReactNode
}

/**
 * The small-screen counterpart to a table row.
 *
 * A five-column table on a 375px phone is unreadable even when it scrolls, so
 * below md the list views render these instead: the identifying field on top,
 * supporting fields as labelled pairs underneath. Sharing one shell keeps
 * devices, alarms and the role editor visually consistent rather than each
 * inventing its own card.
 */
export function DataCard({
  to,
  title,
  badges,
  rows,
  action,
}: {
  to?: string
  title: React.ReactNode
  badges?: React.ReactNode
  rows: DataCardRow[]
  action?: React.ReactNode
}) {
  const heading = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">{title}{badges}</div>
  )

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      {to ? (
        <Link to={to} className="block">
          {heading}
        </Link>
      ) : (
        heading
      )}

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-[11px] text-slate-500">{row.label}</dt>
            <dd className="text-right text-[11px] text-slate-700">{row.value}</dd>
          </div>
        ))}
      </dl>

      {action && <div className="mt-2.5">{action}</div>}
    </div>
  )
}
