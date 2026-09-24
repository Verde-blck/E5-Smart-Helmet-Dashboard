import { useState } from 'react'
import { usePermission } from '@/shared/hooks/usePermission'
import { AdminList } from './components/AdminList'
import { GroupList } from './components/GroupList'

type Tab = 'admins' | 'groups'

const TAB_LABEL: Record<Tab, string> = {
  admins: '',
  groups: '',
}

export function UsersPage() {
  const [tab, setTab] = useState<Tab>('admins')
  const can = usePermission()
  const canEdit = can('users:write')

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-800">{TAB_LABEL[tab]}</h1>
        <div className="flex rounded-md border border-slate-200 bg-white p-0.5 text-xs">
          {(['admins', 'groups'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setTab(option)}
              className={`rounded px-2.5 py-1 ${
                tab === option
                  ? 'bg-brand-primary/10 font-medium text-slate-900'
                  : 'text-slate-500'
              }`}
            >
              {option === 'admins' ? 'Administrators' : 'Groups'}
            </button>
          ))}
        </div>
      </div>

      {!canEdit && (
        <p className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          You can view these settings but not change them.
        </p>
      )}

      {tab === 'admins' ? <AdminList canEdit={canEdit} /> : <GroupList canEdit={canEdit} />}
    </div>
  )
}
