import { ACTIONS, MODULES } from '@/shared/constants/modules'
import type { Action, ModuleKey, Permission } from '@/shared/constants/modules'
import { togglePermission } from '../types'

const ACTION_LABEL: Record<Action, string> = {
  read: 'View',
  write: 'Edit',
  delete: 'Delete',
}

interface Props {
  permissions: Permission[]
  disabled?: boolean
  onChange: (next: Permission[]) => void
}

function Checkbox({
  checked,
  disabled,
  label,
  onToggle,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onToggle}
      aria-label={label}
      className="h-4 w-4 cursor-pointer accent-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
    />
  )
}

export function PermissionMatrix({ permissions, disabled, onChange }: Props) {
  const held = new Set(permissions)
  const has = (key: ModuleKey, action: Action) => held.has(`${key}:${action}` as Permission)
  const toggle = (key: ModuleKey, action: Action) =>
    onChange(togglePermission(permissions, key, action))

  return (
    <>
      {/* Phones: a card per module. Eighteen checkboxes in a grid is the one
          layout in this app that genuinely cannot survive 375px as a table. */}
      <div className="flex flex-col gap-2 md:hidden">
        {MODULES.map((module) => (
          <div key={module.key} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-medium text-slate-800">{module.label}</p>
            <div className="mt-2 flex flex-wrap gap-4">
              {ACTIONS.map((action) => (
                <label key={action} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Checkbox
                    checked={has(module.key, action)}
                    disabled={disabled}
                    label={`${ACTION_LABEL[action]} ${module.label}`}
                    onToggle={() => toggle(module.key, action)}
                  />
                  {ACTION_LABEL[action]}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Module</th>
              {ACTIONS.map((action) => (
                <th key={action} className="w-24 px-4 py-2 text-center font-medium">
                  {ACTION_LABEL[action]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((module) => (
              <tr key={module.key} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-700">{module.label}</td>
                {ACTIONS.map((action) => (
                  <td key={action} className="px-4 py-2 text-center">
                    <Checkbox
                      checked={has(module.key, action)}
                      disabled={disabled}
                      label={`${ACTION_LABEL[action]} ${module.label}`}
                      onToggle={() => toggle(module.key, action)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] text-slate-400">
        Edit and Delete include View automatically — a role can't change what it
        can't see.
      </p>
    </>
  )
}
