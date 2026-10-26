import type { AuthUser, TenantConfig } from '@/shared/store/authStore'
import { ALL_PERMISSIONS } from '@/shared/constants/modules'
import type { Permission } from '@/shared/constants/modules'
import { expandPermissions } from '@/modules/users/lib/permissions'

const fromCodes = (codes: string[]) => expandPermissions(codes) as Permission[]

export const mockTenant: TenantConfig = {
  id: 'tenant-demo',
  name: 'Acme Construction',
  logoUrl: '',
  colors: { primary: '#0f766e', secondary: '#1e293b' },
}

export const mockAdmin: AuthUser = {
  id: 'user-1',
  username: 'ADM-001',
  name: 'VERDEblck',
  email: 'david@example.com',
  role: 'Super admin',
  permissions: ALL_PERMISSIONS,
  superAdmin: true,
  apiPermissions: [],
  deviceIds: [],
  scope: { allSites: true, sites: [] },
}

export const mockOperator: AuthUser = {
  id: 'user-2',
  username: 'OP-014',
  name: 'Site Operator',
  email: 'operator@example.com',
  role: 'Monitoring',
  apiPermissions: ['MONITORING_CENTER', 'SURVEILLANCE', 'ALARM_RECORD'],
  permissions: fromCodes(['MONITORING_CENTER', 'SURVEILLANCE', 'ALARM_RECORD']),
  deviceIds: [],
  scope: { allSites: true, sites: [] },
}

export const mockViewer: AuthUser = {
  id: 'user-3',
  username: 'VIEW-001',
  name: 'Tunde (viewer)',
  role: 'Viewer',
  apiPermissions: ['DASHBOARD', 'TRACK_PLAYBACK'],
  permissions: fromCodes(['DASHBOARD', 'TRACK_PLAYBACK']),
  deviceIds: [],
  scope: { allSites: true, sites: [] },
}

export const mockNewStarter: AuthUser = {
  id: 'user-5',
  username: 'NEW-001',
  name: 'Chidi Eze',
  role: 'Monitoring',
  apiPermissions: ['MONITORING_CENTER', 'ALARM_RECORD'],
  permissions: fromCodes(['MONITORING_CENTER', 'ALARM_RECORD']),
  mustChangePassword: true,
  scope: { allSites: true, sites: [] },
}

export function mockUserFor(username: string): AuthUser {
  const id = username.trim().toUpperCase()
  if (id.startsWith('OP')) return mockOperator
  if (id.startsWith('VIEW')) return mockViewer
  if (id.startsWith('SETUP')) return { ...mockAdmin, id: 'user-9', username: 'SETUP-001', name: 'New supervisor', mustSetup2fa: true }
  if (id.startsWith('NEW')) return mockNewStarter
  return mockAdmin
}
