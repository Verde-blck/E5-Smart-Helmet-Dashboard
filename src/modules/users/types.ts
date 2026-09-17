import type { Action, ModuleKey, Permission } from '@/shared/constants/modules'

export interface Role {
  id: string
  name: string
  description?: string
  permissions: Permission[]
  /**
   * System roles can't be edited or deleted. There is always exactly one —
   * Admin — and it always holds every permission. It's the reason a tenant
   * can't configure itself out of its own dashboard: however badly the other
   * roles are set up, this one is a way back in.
   */
  isSystem: boolean
  userCount: number
}

export interface ManagedUser {
  id: string
  name: string
  email: string
  roleId: string
  status: 'active' | 'invited' | 'disabled'
  lastActiveAt?: number
}

/**
 * Toggling one cell of the matrix, with the two implications that make the
 * result coherent:
 *
 *  - granting write or delete grants read, because "can delete recordings but
 *    can't see them" isn't a state any screen can render;
 *  - revoking read revokes write and delete with it, for the same reason.
 *
 * Doing this at toggle time means an incoherent combination never reaches the
 * backend, rather than being rejected after the fact.
 */
export function togglePermission(
  permissions: Permission[],
  moduleKey: ModuleKey,
  action: Action
): Permission[] {
  const next = new Set(permissions)
  const target = `${moduleKey}:${action}` as Permission

  if (next.has(target)) {
    next.delete(target)
    if (action === 'read') {
      next.delete(`${moduleKey}:write` as Permission)
      next.delete(`${moduleKey}:delete` as Permission)
    }
  } else {
    next.add(target)
    if (action !== 'read') next.add(`${moduleKey}:read` as Permission)
  }

  return [...next]
}

export function moduleAccessSummary(permissions: Permission[]): string {
  const modules = new Set(permissions.map((p) => p.split(':')[0]))
  if (modules.size === 0) return 'No access'
  return `${modules.size} module${modules.size === 1 ? '' : 's'}`
}
