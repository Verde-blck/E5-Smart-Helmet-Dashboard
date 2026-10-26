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

export async function fetchAdmins(): Promise<Administrator[]> {
  if (env.useMocks) return getMockAdmins()
  const { data } = await apiClient.get<Administrator[]>('/admins')
  return data ?? []
}

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
  // Omitted rather than sent empty, so a blank field never wipes a working password.
  const body = { ...patch }
  if (!body.password) delete body.password
  const { data } = await apiClient.put<Administrator>(`/admins/${id}`, body)
  return data
}

export async function deleteAdmin(id: number): Promise<void> {
  if (env.useMocks) return deleteMockAdmin(id)
  await apiClient.delete(`/admins/${id}`)
}

export async function resetAdminTwoFactor(id: number): Promise<void> {
  if (env.useMocks) {
    updateMockAdmin(id, { twoFactorEnabled: false } as AdministratorUpdate)
    return
  }
  await apiClient.post(`/admins/${id}/2fa/reset`)
}

let mockRequire2fa = false

export async function fetchRequire2fa(): Promise<boolean> {
  if (env.useMocks) return mockRequire2fa
  const { data } = await apiClient.get<{ require2fa?: boolean }>('/settings/security')
  return data?.require2fa === true
}

export async function saveRequire2fa(require2fa: boolean): Promise<boolean> {
  if (env.useMocks) {
    mockRequire2fa = require2fa
    return require2fa
  }
  const { data } = await apiClient.put<{ require2fa?: boolean }>('/settings/security', { require2fa })
  return data?.require2fa === true
}

export async function fetchPermissions(): Promise<ApiPermission[]> {
  if (env.useMocks) return allPermissionCodes()
  try {
    const { data } = await apiClient.get<ApiPermission[]>('/permissions')
    return data?.length ? data : allPermissionCodes()
  } catch {
    return allPermissionCodes()
  }
}

export async function fetchGroups(): Promise<Group[]> {
  if (env.useMocks) return getMockGroups()
  const { data } = await apiClient.get<Group[]>('/groups')
  return data ?? []
}

export async function createGroup(name: string): Promise<Group> {
  if (env.useMocks) return createMockGroup(name)
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
