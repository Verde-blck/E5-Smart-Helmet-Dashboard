import { useState } from 'react'
import { AlarmFeed } from './components/AlarmFeed'
import { useAlarms } from './hooks/useAlarms'

export function AlarmsPage() {
  const [activeOnly, setActiveOnly] = useState(true)
  const { active, alarms } = useAlarms()

  const critical = active.filter((a) => a.severity === 'critical').length

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-800">Alarm &amp; event centre</h1>
        <div className="flex rounded-md border border-slate-200 bg-white p-0.5 text-xs">
          <button
            onClick={() => setActiveOnly(true)}
            className={`rounded px-2.5 py-1 ${
              activeOnly ? 'bg-brand-primary/10 font-medium text-slate-900' : 'text-slate-500'
            }`}
          >
            Active ({active.length})
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
          {critical} unacknowledged critical {critical === 1 ? 'event' : 'events'} — SOS and
          fall events need a response.
        </div>
      )}

      <AlarmFeed activeOnly={activeOnly} />
    </div>
  )
}
