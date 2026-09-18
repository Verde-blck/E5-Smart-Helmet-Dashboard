import { useState } from 'react'
import { useDevices } from '@/modules/devices/hooks/useDevices'
import { useCreateUser, useRoles, useUpdateUser } from '../hooks/useRoles'
import type { ManagedUser } from '../types'

interface Props {
  /** Omit to create; pass a user to edit. */
  user?: ManagedUser
  onDone: () => void
}

const EMPTY = {
  staffId: '',
  name: '',
  email: '',
  phone: '',
  assignedSite: '',
  assignedDeviceIds: [] as string[],
  roleId: '',
  initialPassword: '',
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

const inputClass =
  'w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm'

export function UserForm({ user, onDone }: Props) {
  const { roles } = useRoles()
  const { devices } = useDevices()
  const create = useCreateUser()
  const update = useUpdateUser()
  const editing = !!user

  const [values, setValues] = useState(() =>
    user
      ? {
          staffId: user.staffId,
          name: user.name,
          email: user.email ?? '',
          phone: user.phone ?? '',
          assignedSite: user.assignedSite ?? '',
          assignedDeviceIds: user.assignedDeviceIds,
          roleId: user.roleId,
          initialPassword: '',
        }
      : { ...EMPTY, roleId: roles[0]?.id ?? '' }
  )
  const [error, setError] = useState<string | null>(null)

  // Site options come from the fleet rather than a hardcoded list, so adding a
  // site means registering a helmet there, not editing this file.
  const sites = [...new Set(devices.map((d) => d.site))].sort()

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const toggleDevice = (id: string) =>
    set(
      'assignedDeviceIds',
      values.assignedDeviceIds.includes(id)
        ? values.assignedDeviceIds.filter((d) => d !== id)
        : [...values.assignedDeviceIds, id]
    )

  function validate(): string | null {
    if (values.staffId.trim().length < 2) return 'Staff ID is required'
    if (values.name.trim().length < 2) return 'Name is required'
    if (!values.roleId) return 'Choose a role'
    // A scoped role with no site means an empty dashboard and a confused new
    // starter, so it's caught here rather than discovered on their first login.
    const role = roles.find((r) => r.id === values.roleId)
    if (role && !role.allSites && !values.assignedSite) {
      return `${role.name} only sees its assigned site, so a site is required`
    }
    if (!editing && values.initialPassword.length < 8) {
      return 'Initial password needs at least 8 characters'
    }
    if (values.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
      return 'That email address is not valid'
    }
    return null
  }

  async function submit() {
    const problem = validate()
    setError(problem)
    if (problem) return

    try {
      if (editing && user) {
        await update.mutateAsync({
          id: user.id,
          patch: {
            staffId: values.staffId.trim(),
            name: values.name.trim(),
            email: values.email || undefined,
            phone: values.phone || undefined,
            assignedSite: values.assignedSite || undefined,
            assignedDeviceIds: values.assignedDeviceIds,
            roleId: values.roleId,
          },
        })
      } else {
        await create.mutateAsync({
          staffId: values.staffId.trim(),
          name: values.name.trim(),
          email: values.email || undefined,
          phone: values.phone || undefined,
          assignedSite: values.assignedSite || undefined,
          assignedDeviceIds: values.assignedDeviceIds,
          roleId: values.roleId,
          initialPassword: values.initialPassword,
        })
      }
      onDone()
    } catch {
      setError(
        editing
          ? 'Could not save. That staff ID may already be in use.'
          : 'Could not create the account. That staff ID may already be in use.'
      )
    }
  }

  const pending = create.isPending || update.isPending

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-medium text-slate-800">
        {editing ? `Edit ${user?.name}` : 'Add a person'}
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Staff ID" hint="What they sign in with.">
          <input
            value={values.staffId}
            onChange={(e) => set('staffId', e.target.value)}
            spellCheck={false}
            className={inputClass}
          />
        </Field>

        <Field label="Full name">
          <input
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Phone" hint="For contact during an incident.">
          <input
            value={values.phone}
            onChange={(e) => set('phone', e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Email (optional)" hint="Contact only — not used to sign in.">
          <input
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            spellCheck={false}
            className={inputClass}
          />
        </Field>

        <Field
          label="Assigned site"
          hint="Determines which helmets, alarms and footage this person sees."
        >
          <select
            value={values.assignedSite}
            onChange={(e) => set('assignedSite', e.target.value)}
            className={inputClass}
          >
            <option value="">Not set</option>
            {sites.map((site) => (
              <option key={site} value={site}>
                {site}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Role">
          <select
            value={values.roleId}
            onChange={(e) => set('roleId', e.target.value)}
            className={inputClass}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {!editing && (
        <div className="mt-3">
          <Field
            label="Initial password"
            hint="Give this to them in person. They'll be required to change it the first time they sign in."
          >
            <input
              type="text"
              value={values.initialPassword}
              onChange={(e) => set('initialPassword', e.target.value)}
              spellCheck={false}
              className={`${inputClass} font-mono sm:max-w-xs`}
            />
          </Field>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-1 text-xs text-slate-500">
          Helmets they're responsible for{' '}
          <span className="text-slate-400">
            ({values.assignedDeviceIds.length} selected)
          </span>
        </p>
        <div className="max-h-40 overflow-y-auto rounded border border-slate-200">
          {devices.map((device) => (
            <label
              key={device.id}
              className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-2.5 py-1.5 text-xs last:border-0 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={values.assignedDeviceIds.includes(device.id)}
                onChange={() => toggleDevice(device.id)}
                className="h-3.5 w-3.5 accent-brand-primary"
              />
              <span className="font-medium text-slate-700">{device.name}</span>
              <span className="text-slate-400">{device.site}</span>
            </label>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          A record of responsibility, not a permission — it does not limit which
          helmets this person can see.
        </p>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded bg-brand-primary px-3 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
        >
          {pending ? 'Saving…' : editing ? 'Save changes' : 'Create account'}
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
