import { DataCard } from '@/shared/components/DataCard'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { useNow } from '@/shared/hooks/useNow'
import { useAssignRole, useRoles, useUsers } from '../hooks/useRoles'
import type { ManagedUser, Role } from '../types'

const STATUS_STYLE = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  invited: 'bg-amber-50 text-amber-700 ring-amber-200',
  disabled: 'bg-slate-50 text-slate-500 ring-slate-200',
} as const

function StatusChip({ status }: { status: ManagedUser['status'] }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ring-1 ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  )
}

function RoleSelect({
  user,
  roles,
  canEdit,
}: {
  user: ManagedUser
  roles: Role[]
  canEdit: boolean
}) {
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

export function UserList({ canEdit }: { canEdit: boolean }) {
  const { users, isLoading, isError } = useUsers()
  const { roles } = useRoles()
  const now = useNow(60_000)

  if (isLoading) return <p className="text-sm text-slate-500">Loading people…</p>
  if (isError) return <p className="text-sm text-red-600">Failed to load people.</p>

  return (
    <>
      <div className="flex flex-col gap-2 md:hidden">
        {users.map((user) => (
          <DataCard
            key={user.id}
            title={<span className="text-sm font-medium text-slate-800">{user.name}</span>}
            badges={<StatusChip status={user.status} />}
            rows={[
              { label: 'Email', value: user.email },
              {
                label: 'Last active',
                value: user.lastActiveAt ? formatLastSeen(user.lastActiveAt, now) : 'Never',
              },
            ]}
            action={<RoleSelect user={user} roles={roles} canEdit={canEdit} />}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Person</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Last active</th>
              <th className="px-4 py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <p className="font-medium text-slate-800">{user.name}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </td>
                <td className="px-4 py-2">
                  <StatusChip status={user.status} />
                </td>
                <td className="px-4 py-2 text-slate-500">
                  {user.lastActiveAt ? formatLastSeen(user.lastActiveAt, now) : 'Never'}
                </td>
                <td className="px-4 py-2">
                  <RoleSelect user={user} roles={roles} canEdit={canEdit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
