import { useEffect, useState } from 'react'
import { useDeleteRole, useLockoutGuard, useSaveRole } from '../hooks/useRoles'
import { PermissionMatrix } from './PermissionMatrix'
import type { Permission } from '@/shared/constants/modules'
import type { Role } from '../types'

export function RoleEditor({
  role,
  roles,
  canEdit,
  onDeleted,
}: {
  role: Role
  roles: Role[]
  canEdit: boolean
  onDeleted: () => void
}) {
  const [name, setName] = useState(role.name)
  const [draft, setDraft] = useState<Permission[]>(role.permissions)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const save = useSaveRole()
  const remove = useDeleteRole()
  const checkLockout = useLockoutGuard(roles)

  // Reset the working copy when a different role is selected, or edits would
  // bleed from one role onto the next.
  useEffect(() => {
    setName(role.name)
    setDraft(role.permissions)
    setConfirmingDelete(false)
  }, [role.id, role.name, role.permissions])

  const locked = role.isSystem || !canEdit
  const dirty =
    name !== role.name ||
    draft.length !== role.permissions.length ||
    draft.some((p) => !role.permissions.includes(p))

  const lockoutWarning = checkLockout(role, draft)
  const nameProblem = name.trim().length < 2 ? 'Name needs at least 2 characters' : null
  const blocked = !!lockoutWarning || !!nameProblem

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <input
            value={name}
            disabled={locked}
            onChange={(e) => setName(e.target.value)}
            className="w-full max-w-xs rounded border border-slate-300 px-2 py-1 text-sm font-medium disabled:border-transparent disabled:bg-transparent disabled:px-0"
          />
          <p className="mt-1 text-xs text-slate-500">
            {role.userCount} {role.userCount === 1 ? 'user' : 'users'}
            {role.description ? ` · ${role.description}` : ''}
          </p>
        </div>

        {role.isSystem && (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
            Built-in role
          </span>
        )}
      </div>

      {role.isSystem && (
        <p className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Admin always holds every permission and can't be edited or deleted.
          It's what guarantees a way back in if the other roles are misconfigured.
        </p>
      )}

      <PermissionMatrix permissions={draft} disabled={locked} onChange={setDraft} />

      {lockoutWarning && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {lockoutWarning}
        </p>
      )}

      {canEdit && !role.isSystem && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() =>
              save.mutate({ id: role.id, patch: { name: name.trim(), permissions: draft } })
            }
            disabled={!dirty || blocked || save.isPending}
            className="rounded bg-brand-primary px-3 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save role'}
          </button>
          <button
            onClick={() => {
              setName(role.name)
              setDraft(role.permissions)
            }}
            disabled={!dirty || save.isPending}
            className="text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50"
          >
            Discard
          </button>

          {nameProblem && dirty && (
            <span className="text-xs text-red-600">{nameProblem}</span>
          )}
          {save.isError && <span className="text-xs text-red-600">Save failed.</span>}

          <div className="ml-auto">
            {confirmingDelete ? (
              <span className="flex items-center gap-2 text-xs">
                <span className="text-slate-600">
                  {role.userCount > 0
                    ? `${role.userCount} user${role.userCount === 1 ? '' : 's'} would lose access.`
                    : 'Delete this role?'}
                </span>
                <button
                  onClick={() => remove.mutate(role.id, { onSuccess: onDeleted })}
                  className="rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="text-xs text-red-600 hover:underline"
              >
                Delete role
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
