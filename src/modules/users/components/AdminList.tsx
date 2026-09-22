import { useState } from 'react'
import { DataCard } from '@/shared/components/DataCard'
import { useAdmins, useDeleteAdmin, useGroups } from '../hooks/useAdmins'
import { AdminForm } from './AdminForm'
import type { Administrator } from '../types'

export function AdminList({ canEdit }: { canEdit: boolean }) {
  const { admins, isLoading, isError } = useAdmins()
  const { groups } = useGroups()
  const remove = useDeleteAdmin()
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<
    { kind: 'none' } | { kind: 'create' } | { kind: 'edit'; admin: Administrator }
  >({ kind: 'none' })
  const [confirming, setConfirming] = useState<number | null>(null)

  if (mode.kind !== 'none') {
    return (
      <AdminForm
        key={mode.kind === 'edit' ? mode.admin.id : 'new'}
        admin={mode.kind === 'edit' ? mode.admin : undefined}
        onDone={() => setMode({ kind: 'none' })}
      />
    )
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading administrators…</p>
  if (isError) return <p className="text-sm text-red-600">Failed to load administrators.</p>

  const needle = search.trim().toLowerCase()
  const rows = needle
    ? admins.filter((a) => a.username.toLowerCase().includes(needle))
    : admins

  // A group that no longer exists still leaves its id on the account. Naming
  // that explicitly beats rendering a blank cell that looks like "no group".
  const groupName = (id: number | null | undefined) => {
    if (id == null) return '—'
    const found = groups.find((g) => g.id === id)
    return found ? found.name : `Missing group (${id})`
  }

  const actions = (admin: Administrator) => {
    if (!canEdit) return null

    if (confirming === admin.id) {
      return (
        <span className="flex items-center justify-end gap-2 text-xs">
          <span className="text-slate-600">Delete {admin.username}?</span>
          <button
            onClick={() => remove.mutate(admin.id, { onSettled: () => setConfirming(null) })}
            className="rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50"
          >
            Confirm
          </button>
          <button onClick={() => setConfirming(null)} className="text-slate-500">
            Cancel
          </button>
        </span>
      )
    }

    return (
      <span className="flex items-center justify-end gap-3 text-xs">
        <button
          onClick={() => setMode({ kind: 'edit', admin })}
          className="text-slate-500 hover:text-slate-800"
        >
          Edit
        </button>
        <button onClick={() => setConfirming(admin.id)} className="text-red-600 hover:underline">
          Delete
        </button>
      </span>
    )
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Enter the administrator account you are looking for"
          className="w-72 max-w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm"
        />
        {canEdit && (
          <button
            onClick={() => setMode({ kind: 'create' })}
            className="rounded bg-brand-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90"
          >
            + Add
          </button>
        )}
      </div>

      <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        {/* Stated by the backend, and worth repeating where the choices are
            actually made rather than burying it in a document. */}
        Permissions and device restrictions are saved but not yet enforced —
        every signed-in administrator can currently reach the whole system.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          {search ? 'No administrators match that search.' : 'No administrators yet.'}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2 md:hidden">
            {rows.map((admin) => (
              <DataCard
                key={admin.id}
                title={<span className="text-sm font-medium text-slate-800">{admin.username}</span>}
                rows={[
                  { label: 'Phone', value: admin.mobilePhone || '—' },
                  { label: 'Role', value: admin.role || '—' },
                  { label: 'Department', value: admin.department || '—' },
                  { label: 'Group', value: groupName(admin.groupId) },
                  { label: 'Permissions', value: admin.permissions.length || '—' },
                  {
                    label: 'Devices',
                    value: admin.deviceIds.length || 'All',
                  },
                ]}
                action={actions(admin)}
              />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Admin account</th>
                  <th className="px-4 py-2 font-medium">Mobile phone number</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Group</th>
                  <th className="px-4 py-2 font-medium">Access</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((admin) => (
                  <tr key={admin.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <p className="font-medium text-slate-800">{admin.username}</p>
                      {admin.department && (
                        <p className="text-xs text-slate-400">{admin.department}</p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{admin.mobilePhone || '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{admin.role || '—'}</td>
                    <td
                      className={`px-4 py-2 ${
                        admin.groupId != null && !groups.some((g) => g.id === admin.groupId)
                          ? 'text-amber-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {groupName(admin.groupId)}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {admin.permissions.length} module
                      {admin.permissions.length === 1 ? '' : 's'}
                      <span className="text-slate-400">
                        {' · '}
                        {admin.deviceIds.length
                          ? `${admin.deviceIds.length} helmet${admin.deviceIds.length === 1 ? '' : 's'}`
                          : 'all helmets'}
                      </span>
                    </td>
                    <td className="px-4 py-2">{actions(admin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
