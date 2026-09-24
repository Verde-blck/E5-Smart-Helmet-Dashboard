import { useState } from 'react'
import { AlarmFeed } from './components/AlarmFeed'
import { GasOverviewPanel } from './components/GasOverviewPanel'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { useAlarms } from './hooks/useAlarms'

export function AlarmsPage() {
  const [activeOnly, setActiveOnly] = useState(true)
  const { active, alarms } = useAlarms()

  const critical = active.filter((a) => a.severity === 'critical').length

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        
        <div className="flex rounded-md border border-slate-200 bg-white p-0.5 text-xs">
          <button
            onClick={() => setActiveOnly(true)}
            className={`rounded px-2.5 py-1 ${
              activeOnly ? 'bg-brand-primary/10 font-medium text-slate-900' : 'text-slate-500'
            }`}
          >
            Unresolved ({active.length})
          </button>
          <button
            onClick={() => setActiveOnly(false)}
            className={`rounded px-2.5 py-1 ${
              !activeOnly ? 'bg-brand-primary/10 font-medium text-slate-900' : 'text-slate-500'
            }`}
          >
            All ({alarms.length})
          </button>
        </div>
      </div>

      {critical > 0 && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {critical} unresolved critical {critical === 1 ? 'event' : 'events'} — SOS,
          fall, silent and near-electricity alarms need a response.
        </div>
      )}

      <ErrorBoundary label="Gas exposure">
        <GasOverviewPanel />
      </ErrorBoundary>

      <AlarmFeed activeOnly={activeOnly} />
    </div>
  )
}
