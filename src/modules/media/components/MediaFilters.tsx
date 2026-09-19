import { useDevices } from '@/modules/devices/hooks/useDevices'
import type { MediaQuery } from '../types'

interface Props {
  query: MediaQuery
  onChange: (next: MediaQuery) => void
  /** Video Record searches file names; Photo Record doesn't. */
  withSearch?: boolean
  resultCount: number
  isFetching: boolean
}

const control = 'rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700'

export function MediaFilters({ query, onChange, withSearch, resultCount, isFetching }: Props) {
  const { devices } = useDevices()
  const hasFilters = !!(query.deviceId || query.date || query.search)

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[11px] text-slate-500">Device</label>
          <select
            value={query.deviceId ?? ''}
            onChange={(e) => onChange({ ...query, deviceId: e.target.value || undefined })}
            className={`${control} w-full sm:w-44`}
          >
            <option value="">All devices</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] text-slate-500">Date</label>
          <input
            type="date"
            value={query.date ?? ''}
            onChange={(e) => onChange({ ...query, date: e.target.value || undefined })}
            className={`${control} w-full sm:w-40`}
          />
        </div>

        {withSearch && (
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-[11px] text-slate-500">File name</label>
            <input
              type="search"
              value={query.search ?? ''}
              placeholder="Search recordings"
              onChange={(e) => onChange({ ...query, search: e.target.value || undefined })}
              className={`${control} w-full`}
            />
          </div>
        )}

        {hasFilters && (
          <button
            onClick={() => onChange({ kind: query.kind })}
            className="py-1.5 text-xs text-slate-500 hover:text-slate-800"
          >
            Clear
          </button>
        )}
      </div>

      <p className="mt-2 text-[11px] text-slate-400">
        {isFetching
          ? 'Searching…'
          : `${resultCount} ${resultCount === 1 ? 'result' : 'results'}`}
        {query.date && ' · filtered by capture date, not upload date'}
      </p>
    </div>
  )
}
