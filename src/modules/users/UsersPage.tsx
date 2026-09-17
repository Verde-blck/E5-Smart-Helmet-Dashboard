import { useEffect, useState } from 'react'
import { usePermission } from '@/shared/hooks/usePermission'
import { useCreateRole, useRoles } from './hooks/useRoles'
import { RoleEditor } from './components/RoleEditor'
import { UserList } from './components/UserList'
import { moduleAccessSummary } from './types'

type Tab = 'roles' | 'people'

export function UsersPage() {
  const [tab, setTab] = useState<Tab>('roles')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newRoleName, setNewRoleName] = useState('')
  const [adding, setAdding] = useState(false)

  const { roles, isLoading, isError } = useRoles()
  const create = useCreateRole()
  const can = usePermission()
  const canEdit = can('users:write')

  // Keep a valid selection as roles load, and recover if the selected role is
  // deleted underneath us.
  useEffect(() => {
    if (roles.length === 0) return
    if (!selectedId || !roles.some((r) => r.id === selectedId)) {
      setSelectedId(roles[0].id)
    }
  }, [roles, selectedId])

  const selected = roles.find((r) => r.id === selectedId) ?? null

  function submitNewRole() {
    const name = newRoleName.trim()
    if (name.length < 2) return
    create.mutate(name, {
      onSuccess: (role) => {
        setSelectedId(role.id)
        setNewRoleName('')
        setAdding(false)
      },
    })
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-800">Users &amp; roles</h1>
        <div className="flex rounded-md border border-slate-200 bg-white p-0.5 text-xs">
          {(['roles', 'people'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setTab(option)}
              className={`rounded px-2.5 py-1 capitalize ${
                tab === option
                  ? 'bg-brand-primary/10 font-medium text-slate-900'
                  : 'text-slate-500'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {!canEdit && (
        <p className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          You can view roles and people but not change them. Ask an administrator
          for the <span className="font-mono">users:write</span> permission.
        </p>
      )}

      {tab === 'people' && <UserList canEdit={canEdit} />}

      {tab === 'roles' && (
        <>
          {isLoading && <p className="text-sm text-slate-500">Loading roles…</p>}
          {isError && <p className="text-sm text-red-600">Failed to load roles.</p>}

          {roles.length > 0 && (
            <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
              <aside>
                <ul className="flex flex-col gap-1">
                  {roles.map((role) => (
                    <li key={role.id}>
                      <button
                        onClick={() => setSelectedId(role.id)}
                        className={`w-full rounded-md border px-3 py-2 text-left ${
                          role.id === selectedId
                            ? 'border-brand-primary/40 bg-brand-primary/10'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-sm font-medium text-slate-800">
                          {role.name}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {role.userCount} {role.userCount === 1 ? 'user' : 'users'} ·{' '}
                          {moduleAccessSummary(role.permissions)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                {canEdit && (
                  <div className="mt-2">
                    {adding ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitNewRole()
                            if (e.key === 'Escape') setAdding(false)
                          }}
                          placeholder="Role name"
                          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                        <button
                          onClick={submitNewRole}
                          disabled={create.isPending}
                          className="rounded bg-brand-primary px-2 py-1 text-xs text-white disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAdding(true)}
                        className="w-full rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 hover:bg-white"
                      >
                        + New role
                      </button>
                    )}
                  </div>
                )}
              </aside>

              <section className="rounded-lg border border-slate-200 bg-white p-4">
                {selected && (
                  <RoleEditor
                    // Remounting on id change resets the draft cleanly rather
                    // than relying on effects to catch every field.
                    key={selected.id}
                    role={selected}
                    roles={roles}
                    canEdit={canEdit}
                    onDeleted={() => setSelectedId(null)}
                  />
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  )
}
