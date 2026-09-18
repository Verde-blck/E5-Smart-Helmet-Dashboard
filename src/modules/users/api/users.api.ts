import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import {
  assignMockRole,
  createMockUser,
  resetMockPassword,
  updateMockUser,
  createMockRole,
  deleteMockRole,
  getMockRoles,
  getMockUsers,
  updateMockRole,
} from './users.mock'
import type { ManagedUser, NewUserInput, Role } from '../types'

export async function fetchRoles(): Promise<Role[]> {
  if (env.useMocks) return getMockRoles()
  const { data } = await apiClient.get<Role[]>('/roles')
  return data
}

/**
 * The backend must re-check three things on every call here, because none of
 * them can be guaranteed by a client:
 *
 *  1. the caller actually holds users:write;
 *  2. the permission strings are ones the system defines;
 *  3. the change doesn't strip the last users:write from the tenant.
 *
 * The equivalent guards in this UI exist so an admin gets told before they
 * click, not because they're load-bearing.
 */
export async function updateRole(id: string, patch: Partial<Role>): Promise<Role> {
  if (env.useMocks) return updateMockRole(id, patch)
  const { data } = await apiClient.patch<Role>(`/roles/${id}`, patch)
  return data
}

export async function createRole(name: string): Promise<Role> {
  if (env.useMocks) return createMockRole(name)
  const { data } = await apiClient.post<Role>('/roles', { name })
  return data
}

export async function deleteRole(id: string): Promise<void> {
  if (env.useMocks) return deleteMockRole(id)
  await apiClient.delete(`/roles/${id}`)
}

export async function fetchUsers(): Promise<ManagedUser[]> {
  if (env.useMocks) return getMockUsers()
  const { data } = await apiClient.get<ManagedUser[]>('/users')
  return data
}

export async function assignRole(userId: string, roleId: string): Promise<ManagedUser> {
  if (env.useMocks) return assignMockRole(userId, roleId)
  const { data } = await apiClient.patch<ManagedUser>(`/users/${userId}`, { roleId })
  return data
}

/**
 * Administrator-created accounts are the only route by which a user exists —
 * there is no self sign-up. The backend owns two things this call can't: that
 * the staff ID is unique within the tenant, and that the initial password is
 * stored hashed and flagged for replacement.
 */
export async function createUser(input: NewUserInput): Promise<ManagedUser> {
  if (env.useMocks) return createMockUser(input)
  const { data } = await apiClient.post<ManagedUser>('/users', input)
  return data
}

export async function updateUser(
  id: string,
  patch: Partial<ManagedUser>
): Promise<ManagedUser> {
  if (env.useMocks) return updateMockUser(id, patch)
  const { data } = await apiClient.patch<ManagedUser>(`/users/${id}`, patch)
  return data
}

/**
 * Admin-driven reset — there is no self-service path, by design, since the
 * deployment can't rely on outbound email. The administrator sets a temporary
 * password and hands it over; the account is re-flagged so the person must
 * replace it on next sign-in.
 */
export async function resetUserPassword(id: string, temporaryPassword: string): Promise<void> {
  if (env.useMocks) {
    resetMockPassword(id)
    return
  }
  await apiClient.post(`/users/${id}/reset-password`, { temporaryPassword })
}
