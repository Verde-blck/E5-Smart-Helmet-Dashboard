import { PERMISSION_TREE, allPermissionCodes } from '../lib/permissions'
import type { ApiPermission, PermissionNode } from '../lib/permissions'

interface Props {
  granted: ApiPermission[]
  disabled?: boolean
  onChange: (next: ApiPermission[]) => void
  /** Codes the backend reported. Anything outside this is hidden. */
  available: ApiPermission[]
}

function Row({
  node,
  depth,
  granted,
  available,
  disabled,
  toggle,
}: {
  node: PermissionNode
  depth: number
  granted: Set<ApiPermission>
  available: Set<ApiPermission>
  disabled?: boolean
  toggle: (code: ApiPermission) => void
}) {
  // "Set" is a heading in the reference platform, not a permission — it has
  // no code, so it renders as a label with its children beneath.
  const isHeading = !node.code
  const hidden = node.code && available.size > 0 && !available.has(node.code)

  return (
    <>
      {!hidden && (
        <label
          className={`flex items-center gap-2 rounded px-1.5 py-1 text-sm ${
            isHeading ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'
          }`}
          style={{ paddingLeft: `${depth * 16 + 6}px` }}
        >
          {node.code ? (
            <input
              type="checkbox"
              checked={granted.has(node.code)}
              disabled={disabled}
              onChange={() => toggle(node.code as ApiPermission)}
              className="h-4 w-4 accent-brand-primary disabled:opacity-40"
            />
          ) : (
            <span className="h-4 w-4" />
          )}

          <span className={isHeading ? 'text-xs font-medium uppercase tracking-wide text-slate-400' : 'text-slate-700'}>
            {node.label}
          </span>
        </label>
      )}

      {node.children?.map((child) => (
        <Row
          key={child.label}
          node={child}
          depth={depth + 1}
          granted={granted}
          available={available}
          disabled={disabled}
          toggle={toggle}
        />
      ))}
    </>
  )
}

export function PermissionTree({ granted, disabled, onChange, available }: Props) {
  const held = new Set(granted)
  const offered = new Set(available)

  const toggle = (code: ApiPermission) => {
    const next = new Set(held)
    // No cascade: the reference platform grants a parent and its children
    // independently, and the API stores them as a flat list.
    if (next.has(code)) next.delete(code)
    else next.add(code)
    onChange([...next])
  }

  // Only what the tree offers. Using the API's full catalogue here would let
  // "Select all" grant permissions for modules that have no screen.
  const selectable = allPermissionCodes().filter(
    (code) => offered.size === 0 || offered.has(code)
  )

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {granted.length} selected
        </span>
        <span className="flex gap-2 text-xs">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(selectable)}
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

      <div className="max-h-80 overflow-y-auto rounded border border-slate-200 p-1">
        {PERMISSION_TREE.map((node) => (
          <Row
            key={node.label}
            node={node}
            depth={0}
            granted={held}
            available={offered}
            disabled={disabled}
            toggle={toggle}
          />
        ))}
      </div>
    </div>
  )
}
