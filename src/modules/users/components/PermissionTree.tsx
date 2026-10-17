import { PERMISSION_TREE, allPermissionCodes, viewCodeOf } from '../lib/permissions'
import type { ApiPermission, PermissionNode } from '../lib/permissions'

interface Props {
  granted: ApiPermission[]
  disabled?: boolean
  onChange: (next: ApiPermission[]) => void
  /** Codes the backend reported. Anything outside this is hidden. */
  available: ApiPermission[]
  /**
   * Codes the signed-in admin may hand out: the backend refuses to let
   * anyone grant a code they don't hold. Null means everything (super admin).
   */
  grantable?: Set<string> | null
}

const NOT_YOURS = 'You can only grant permissions you hold yourself.'

function Row({
  node,
  depth,
  held,
  offered,
  canGrant,
  disabled,
  onToggleView,
  onToggleManage,
}: {
  node: PermissionNode
  depth: number
  held: Set<ApiPermission>
  offered: Set<ApiPermission>
  canGrant: (code: ApiPermission) => boolean
  disabled?: boolean
  onToggleView: (node: PermissionNode) => void
  onToggleManage: (node: PermissionNode) => void
}) {
  // "Set" is a heading in the reference platform, not a permission.
  const isHeading = !node.code
  const hidden = node.code && offered.size > 0 && !offered.has(node.code)
  const manage = node.manageCode && (offered.size === 0 || offered.has(node.manageCode)) ? node.manageCode : undefined

  const viewing = !!node.code && (held.has(node.code) || (!!manage && held.has(manage)))
  const managing = !!manage && held.has(manage)
  const viewAllowed = !!node.code && canGrant(node.code)
  const manageAllowed = !!manage && canGrant(manage)

  return (
    <>
      {!hidden && (
        <div
          className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded px-1.5 py-1 text-sm ${
            isHeading ? '' : 'hover:bg-slate-50'
          }`}
          style={{ paddingLeft: `${depth * 16 + 6}px` }}
        >
          <label className={`flex min-w-0 flex-1 items-center gap-2 ${isHeading ? 'cursor-default' : 'cursor-pointer'}`}>
            {node.code ? (
              <input
                type="checkbox"
                checked={viewing}
                disabled={disabled || (!viewAllowed && !viewing)}
                title={!viewAllowed ? NOT_YOURS : undefined}
                onChange={() => onToggleView(node)}
                className="h-4 w-4 accent-brand-primary disabled:opacity-40"
              />
            ) : (
              <span className="h-4 w-4" />
            )}
            <span className="min-w-0">
              <span className={isHeading ? 'text-xs font-medium uppercase tracking-wide text-slate-400' : 'text-slate-700'}>
                {node.label}
              </span>
              {node.hint && <span className="block text-[11px] text-slate-400">{node.hint}</span>}
            </span>
          </label>

          {manage && (
            <label
              className={`flex items-center gap-1.5 text-xs ${viewing ? 'text-slate-600' : 'text-slate-400'} cursor-pointer`}
              title={!manageAllowed ? NOT_YOURS : undefined}
            >
              <input
                type="checkbox"
                checked={managing}
                disabled={disabled || (!manageAllowed && !managing)}
                onChange={() => onToggleManage(node)}
                className="h-3.5 w-3.5 accent-brand-primary disabled:opacity-40"
              />
              Can change
            </label>
          )}
        </div>
      )}

      {node.children?.map((child) => (
        <Row
          key={child.label}
          node={child}
          depth={depth + 1}
          held={held}
          offered={offered}
          canGrant={canGrant}
          disabled={disabled}
          onToggleView={onToggleView}
          onToggleManage={onToggleManage}
        />
      ))}
    </>
  )
}

/**
 * Permissions for one administrator. Areas with a view/change split show two
 * boxes: View grants the plain code; Can change grants the _MANAGE code,
 * which includes view, so only one of the two is ever stored.
 */
export function PermissionTree({ granted, disabled, onChange, available, grantable = null }: Props) {
  const held = new Set(granted)
  const offered = new Set(available)

  const canGrant = (code: ApiPermission) =>
    grantable === null || grantable.has(code) || (!code.endsWith('_MANAGE') && grantable.has(`${code}_MANAGE`))

  const onToggleView = (node: PermissionNode) => {
    if (!node.code) return
    const next = new Set(held)
    const on = next.has(node.code) || (!!node.manageCode && next.has(node.manageCode))
    if (on) {
      next.delete(node.code)
      if (node.manageCode) next.delete(node.manageCode)
    } else {
      next.add(node.code)
    }
    onChange([...next])
  }

  const onToggleManage = (node: PermissionNode) => {
    if (!node.code || !node.manageCode) return
    const next = new Set(held)
    if (next.has(node.manageCode)) {
      // Back to view only.
      next.delete(node.manageCode)
      next.add(node.code)
    } else {
      next.add(node.manageCode)
      next.delete(node.code)
    }
    onChange([...next])
  }

  // "Select all" gives the strongest code for each area, within what the
  // backend offers and what this admin may grant.
  const selectAll = () => {
    const best = new Map<string, ApiPermission>()
    for (const code of allPermissionCodes()) {
      if (offered.size > 0 && !offered.has(code)) continue
      if (!canGrant(code)) continue
      const area = viewCodeOf(code)
      if (!best.has(area) || code.endsWith('_MANAGE')) best.set(area, code)
    }
    onChange([...best.values()])
  }

  const areas = new Set(granted.map(viewCodeOf)).size

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {areas} {areas === 1 ? 'area' : 'areas'} selected
        </span>
        <span className="flex gap-2 text-xs">
          <button
            type="button"
            disabled={disabled}
            onClick={selectAll}
            className="text-slate-500 hover:text-slate-800 disabled:opacity-40"
          >
            Select all
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange([])}
            className="text-slate-500 hover:text-slate-800 disabled:opacity-40"
          >
            Unselect all
          </button>
        </span>
      </div>

      <div className="max-h-96 overflow-y-auto rounded border border-slate-200 p-1">
        {PERMISSION_TREE.map((node) => (
          <Row
            key={node.label}
            node={node}
            depth={0}
            held={held}
            offered={offered}
            canGrant={canGrant}
            disabled={disabled}
            onToggleView={onToggleView}
            onToggleManage={onToggleManage}
          />
        ))}
      </div>
    </div>
  )
}
