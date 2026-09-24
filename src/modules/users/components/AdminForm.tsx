import { useState } from 'react'
import { useDevices } from '@/modules/devices/hooks/useDevices'
import { useCreateAdmin, useGroups, usePermissionCatalogue, useUpdateAdmin } from '../hooks/useAdmins'
import { PermissionTree } from './PermissionTree'
import type { ApiPermission } from '../lib/permissions'
import type { Administrator } from '../types'

const input = 'w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm'

function Field({ label, required, hint, children }: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500">
        {required && <span className="text-red-500">* </span>}
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

export function AdminForm({ admin, onDone }: { admin?: Administrator; onDone: () => void }) {
  const { groups } = useGroups()
  const { devices } = useDevices()
  const available = usePermissionCatalogue()
  const create = useCreateAdmin()
  const update = useUpdateAdmin()
  const editing = !!admin

  const [values, setValues] = useState({
    username: admin?.username ?? '',
    password: '',
    department: admin?.department ?? '',
    role: admin?.role ?? '',
    mobilePhone: admin?.mobilePhone ?? '',
    groupId: admin?.groupId ?? null,
    permissions: (admin?.permissions ?? []) as ApiPermission[],
    deviceIds: admin?.deviceIds ?? [],
  })
  const [error, setError] = useState<string | null>(null)
  const [deviceFilter, setDeviceFilter] = useState('')

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const matchingDevices = devices.filter(
    (d) =>
      !deviceFilter.trim() ||
      d.name.toLowerCase().includes(deviceFilter.toLowerCase()) ||
      d.id.includes(deviceFilter.trim())
  )

  function validate(): string | null {
    if (values.username.trim().length < 2) return 'Account name is required'
    if (!editing && values.password.length < 6) {
      return 'Set a login password of at least 6 characters'
    }
    if (values.permissions.length === 0) return 'Select at least one permission'
    return null
  }

  async function submit() {
    const problem = validate()
    setError(problem)
    if (problem) return

    const shared = {
      username: values.username.trim(),
      department: values.department.trim() || undefined,
      role: values.role.trim() || undefined,
      mobilePhone: values.mobilePhone.trim() || undefined,
      groupId: values.groupId,
      permissions: values.permissions,
      deviceIds: values.deviceIds,
    }

    try {
      if (editing && admin) {
        await update.mutateAsync({
          id: admin.id,
          // Blank password means "leave it alone" — the API layer strips it.
          patch: values.password ? { ...shared, password: values.password } : shared,
        })
      } else {
        await create.mutateAsync({ ...shared, password: values.password })
      }
      onDone()
    } catch {
      setError(
        editing
          ? 'Could not save. That account name may already be in use.'
          : 'Could not create the account. That account name may already be in use.'
      )
    }
  }

  const pending = create.isPending || update.isPending

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-medium text-slate-800">
        {editing ? `Edit ${admin?.username}` : 'Add administrator'}
      </h2>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Field label="Account name" required>
            <input
              value={values.username}
              onChange={(e) => set('username', e.target.value)}
              spellCheck={false}
              className={input}
            />
          </Field>

          <Field label="Department">
            <input
              value={values.department}
              onChange={(e) => set('department', e.target.value)}
              className={input}
            />
          </Field>

          <Field label="Mobile phone number">
            <input
              value={values.mobilePhone}
              onChange={(e) => set('mobilePhone', e.target.value)}
              className={input}
            />
          </Field>

          <Field
            label={editing ? 'New password' : 'Login password'}
            required={!editing}
          >
            <input
              type="text"
              value={values.password}
              onChange={(e) => set('password', e.target.value)}
              spellCheck={false}
              className={`${input} font-mono`}
            />
          </Field>

          <Field label="Group" hint="One group per administrator.">
            <select
              value={values.groupId ?? ''}
              onChange={(e) => set('groupId', e.target.value ? Number(e.target.value) : null)}
              className={input}
            >
              <option value="">No group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <p className="mb-1 text-xs text-slate-500">
            <span className="text-red-500">* </span>Permission settings
          </p>
          <PermissionTree
            granted={values.permissions}
            available={available}
            onChange={(next) => set('permissions', next)}
          />
        </div>

        <div>
          <p className="mb-1 text-xs text-slate-500">
            Device choice <span className="text-slate-400">(optional)</span>
          </p>
          <input
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            placeholder="Filter by name or ID"
            className={`${input} mb-2`}
          />
          <div className="max-h-64 overflow-y-auto rounded border border-slate-200">
            {matchingDevices.map((device) => (
              <label
                key={device.id}
                className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-2.5 py-1.5 text-xs last:border-0 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={values.deviceIds.includes(device.id)}
                  onChange={() =>
                    set(
                      'deviceIds',
                      values.deviceIds.includes(device.id)
                        ? values.deviceIds.filter((d) => d !== device.id)
                        : [...values.deviceIds, device.id]
                    )
                  }
                  className="h-3.5 w-3.5 accent-brand-primary"
                />
                <span className="font-medium text-slate-700">{device.name}</span>
                <span className="font-mono text-slate-400">{device.id.slice(-6)}</span>
              </label>
            ))}
            {matchingDevices.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-slate-500">No helmets match.</p>
            )}
          </div>
      
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded bg-brand-primary px-3 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
        >
          {pending ? 'Saving…' : editing ? 'Save changes' : 'Create administrator'}
        </button>
        <button
          onClick={onDone}
          disabled={pending}
          className="text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
