import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import {
  createMockAdmin,
  createMockGroup,
  deleteMockAdmin,
  deleteMockGroup,
  getMockAdmins,
  getMockGroups,
  updateMockAdmin,
  updateMockGroup,
} from './admins.mock'
import { allPermissionCodes } from '../lib/permissions'
import type { ApiPermission } from '../lib/permissions'
import type { Administrator, AdministratorUpdate, Group, NewAdministrator } from '../types'

// ---------------------------------------------------------------------------
// Administrators
// ---------------------------------------------------------------------------

export async function fetchAdmins(): Promise<Administrator[]> {
  if (env.useMocks) return getMockAdmins()
  const { data } = await apiClient.get<Administrator[]>('/admins')
  return data ?? []
}

/**
 * Creating an administrator through this endpoint is the supported path —
 * unlike POST /api/auth/register, which is unauthenticated and should not be
 * used to create staff accounts.
 */
export async function createAdmin(input: NewAdministrator): Promise<Administrator> {
  if (env.useMocks) return createMockAdmin(input)
  const { data } = await apiClient.post<Administrator>('/admins', input)
  return data
}

export async function updateAdmin(
  id: number,
  patch: AdministratorUpdate
): Promise<Administrator> {
  if (env.useMocks) return updateMockAdmin(id, patch)
  // Password is omitted entirely rather than sent empty, so a blank field in
  // the form can never overwrite a working password with nothing.
  const body = { ...patch }
  if (!body.password) delete body.password
  const { data } = await apiClient.put<Administrator>(`/admins/${id}`, body)
  return data
}

export async function deleteAdmin(id: number): Promise<void> {
  if (env.useMocks) return deleteMockAdmin(id)
  await apiClient.delete(`/admins/${id}`)
}

/**
 * The permission catalogue is served by the backend rather than hardcoded, so
 * a module added server-side appears in the form without a frontend release.
 * The local list is a fallback for mock mode and for a failed request.
 */
export async function fetchPermissions(): Promise<ApiPermission[]> {
  if (env.useMocks) return allPermissionCodes()
  try {
    const { data } = await apiClient.get<ApiPermission[]>('/permissions')
    return data?.length ? data : allPermissionCodes()
  } catch {
    return allPermissionCodes()
  }
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export async function fetchGroups(): Promise<Group[]> {
  if (env.useMocks) return getMockGroups()
  const { data } = await apiClient.get<Group[]>('/groups')
  return data ?? []
}

export async function createGroup(name: string): Promise<Group> {
  if (env.useMocks) return createMockGroup(name)
  // createdBy is filled in server-side from the session.
  const { data } = await apiClient.post<Group>('/groups', { name })
  return data
}

export async function renameGroup(id: number, name: string): Promise<Group> {
  if (env.useMocks) return updateMockGroup(id, name)
  const { data } = await apiClient.put<Group>(`/groups/${id}`, { name })
  return data
}

export async function deleteGroup(id: number): Promise<void> {
  if (env.useMocks) return deleteMockGroup(id)
  await apiClient.delete(`/groups/${id}`)
}
