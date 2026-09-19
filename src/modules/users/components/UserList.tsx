import { useState } from 'react'
import { features } from '@/config/features'
import { DataCard } from '@/shared/components/DataCard'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { useNow } from '@/shared/hooks/useNow'
import { useAssignRole, useResetPassword, useRoles, useUpdateUser, useUsers } from '../hooks/useRoles'
import { UserForm } from './UserForm'
import type { ManagedUser, Role } from '../types'

const STATUS_STYLE = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  invited: 'bg-amber-50 text-amber-700 ring-amber-200',
  disabled: 'bg-slate-50 text-slate-500 ring-slate-200',
} as const

function StatusChip({ user }: { user: ManagedUser }) {
  return (
    <>
      <span
        className={`rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ring-1 ${STATUS_STYLE[user.status]}`}
      >
        {user.status}
      </span>
      {user.mustChangePassword && (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
          Password not set
        </span>
      )}
    </>
  )
}

function RoleSelect({ user, roles, canEdit }: { user: ManagedUser; roles: Role[]; canEdit: boolean }) {
  const assign = useAssignRole()
  return (
    <select
      value={user.roleId}
      disabled={!canEdit || assign.isPending}
      onChange={(e) => assign.mutate({ userId: user.id, roleId: e.target.value })}
      className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:bg-slate-50 sm:w-auto"
    >
      {roles.map((role) => (
        <option key={role.id} value={role.id}>
          {role.name}
        </option>
      ))}
    </select>
  )
}

function RowActions({ user, canEdit, onEdit }: { user: ManagedUser; canEdit: boolean; onEdit: () => void }) {
  const reset = useResetPassword()
  const update = useUpdateUser()
  const [resetting, setResetting] = useState(false)
  const [temp, setTemp] = useState('')

  if (!canEdit) return null

  if (resetting) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <input
          autoFocus
          value={temp}
          onChange={(e) => setTemp(e.target.value)}
          placeholder="Temporary password"
          className="w-40 rounded border border-slate-300 px-2 py-1 font-mono text-xs"
        />
        <button
          disabled={temp.length < 8 || reset.isPending}
          onClick={() =>
            reset.mutate(
              { id: user.id, temporaryPassword: temp },
              { onSuccess: () => { setResetting(false); setTemp('') } }
            )
          }
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:opacity-40"
        >
          Set
        </button>
        <button
          onClick={() => { setResetting(false); setTemp('') }}
          className="text-xs text-slate-500"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
      <button onClick={onEdit} className="text-slate-500 hover:text-slate-800">
        Edit
      </button>
      <button
        onClick={() => setResetting(true)}
        className="text-slate-500 hover:text-slate-800"
      >
        Reset password
      </button>
      {/* Suspend rather than delete: a departed worker's account must stop
          working, but the alarms they acknowledged keep their name. */}
      <button
        onClick={() =>
          update.mutate({
            id: user.id,
            patch: { status: user.status === 'disabled' ? 'active' : 'disabled' },
          })
        }
        className="text-slate-500 hover:text-slate-800"
      >
        {user.status === 'disabled' ? 'Reinstate' : 'Suspend'}
      </button>
    </div>
  )
}

export function UserList({ canEdit }: { canEdit: boolean }) {
  const { users, isLoading, isError } = useUsers()
  const { roles } = useRoles()
  const now = useNow(60_000)
  const [mode, setMode] = useState<{ kind: 'none' } | { kind: 'create' } | { kind: 'edit'; user: ManagedUser }>({ kind: 'none' })

  if (isLoading) return <p className="text-sm text-slate-500">Loading people…</p>
  if (isError) return <p className="text-sm text-red-600">Failed to load people.</p>

  if (mode.kind !== 'none') {
    return (
      <UserForm
        key={mode.kind === 'edit' ? mode.user.id : 'new'}
        user={mode.kind === 'edit' ? mode.user : undefined}
        onDone={() => setMode({ kind: 'none' })}
      />
    )
  }

  return (
    <>
      {canEdit && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {users.length} {users.length === 1 ? 'administrator' : 'administrators'}.
            Accounts exist only when an administrator creates them — there is no
            sign-up.
          </p>
          <button
            onClick={() => setMode({ kind: 'create' })}
            className="shrink-0 rounded bg-brand-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90"
          >
            + Add person
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 md:hidden">
        {users.map((user) => (
          <DataCard
            key={user.id}
            title={<span className="text-sm font-medium text-slate-800">{user.name}</span>}
            badges={<StatusChip user={user} />}
            rows={[
              { label: 'Username', value: <span className="font-mono">{user.username}</span> },
              ...(features.siteScoping && user.assignedSite
                ? [{ label: 'Site', value: user.assignedSite }]
                : []),
              ...(user.phone ? [{ label: 'Phone', value: user.phone }] : []),
              {
                label: 'Last active',
                value: user.lastActiveAt ? formatLastSeen(user.lastActiveAt, now) : 'Never',
              },
              { label: 'Role', value: <RoleSelect user={user} roles={roles} canEdit={canEdit} /> },
            ]}
            action={
              <RowActions
                user={user}
                canEdit={canEdit}
                onEdit={() => setMode({ kind: 'edit', user })}
              />
            }
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Person</th>
              {features.siteScoping && <th className="px-4 py-2 font-medium">Site</th>}
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <p className="font-medium text-slate-800">{user.name}</p>
                  <p className="font-mono text-xs text-slate-400">{user.username}</p>
                </td>
                {features.siteScoping && (
                  <td className="px-4 py-2 text-slate-600">{user.assignedSite ?? '—'}</td>
                )}
                <td className="px-4 py-2 text-slate-600">{user.phone ?? '—'}</td>
                <td className="px-4 py-2">
                  <StatusChip user={user} />
                </td>
                <td className="px-4 py-2">
                  <RoleSelect user={user} roles={roles} canEdit={canEdit} />
                </td>
                <td className="px-4 py-2">
                  <RowActions
                    user={user}
                    canEdit={canEdit}
                    onEdit={() => setMode({ kind: 'edit', user })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
