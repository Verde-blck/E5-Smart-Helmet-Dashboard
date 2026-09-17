import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { useAuth } from '@/shared/hooks/useAuth'
import { qk } from '@/shared/lib/query-keys'
import {
  assignRole,
  createRole,
  deleteRole,
  fetchRoles,
  fetchUsers,
  updateRole,
} from '../api/users.api'
import type { Permission } from '@/shared/constants/modules'
import type { Role } from '../types'

export function useRoles() {
  const tenantId = useTenantId()
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.roles(tenantId),
    queryFn: fetchRoles,
  })
  return { roles: data ?? [], isLoading, isError }
}

export function useUsers() {
  const tenantId = useTenantId()
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.users(tenantId),
    queryFn: fetchUsers,
  })
  return { users: data ?? [], isLoading, isError }
}

function useInvalidateRbac() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  return () => {
    void queryClient.invalidateQueries({ queryKey: qk.roles(tenantId) })
    void queryClient.invalidateQueries({ queryKey: qk.users(tenantId) })
  }
}

export function useSaveRole() {
  const invalidate = useInvalidateRbac()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Role> }) => updateRole(id, patch),
    onSuccess: invalidate,
  })
}

export function useCreateRole() {
  const invalidate = useInvalidateRbac()
  return useMutation({ mutationFn: (name: string) => createRole(name), onSuccess: invalidate })
}

export function useDeleteRole() {
  const invalidate = useInvalidateRbac()
  return useMutation({ mutationFn: (id: string) => deleteRole(id), onSuccess: invalidate })
}

export function useAssignRole() {
  const invalidate = useInvalidateRbac()
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      assignRole(userId, roleId),
    onSuccess: invalidate,
  })
}

/**
 * Stops an admin locking the tenant out of its own settings.
 *
 * Two ways that happens: removing users:write from the only role that has it,
 * or removing it from the role you yourself hold. Either leaves nobody able to
 * reach this screen, and the only repair is editing the database by hand.
 *
 * Matching the current user's role by name is a UI convenience — the
 * authoritative check belongs on the backend, by id, where it can also see
 * roles this admin can't.
 */
export function useLockoutGuard(roles: Role[]) {
  const { user } = useAuth()

  return (role: Role, draft: Permission[]): string | null => {
    const stillHasAdminRights = draft.includes('users:write')
    if (stillHasAdminRights) return null

    const otherHolders = roles.filter(
      (r) => r.id !== role.id && r.permissions.includes('users:write') && r.userCount > 0
    )

    if (otherHolders.length === 0) {
      return 'This is the only role that can manage users. Removing that permission would leave nobody able to change roles.'
    }

    if (user && role.name === user.role) {
      return "This is your own role. Removing user management would lock you out of this screen — ask another administrator to make the change instead."
    }

    return null
  }
}
