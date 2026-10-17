import type { AuthUser, TenantConfig } from '@/shared/store/authStore'
import { ALL_PERMISSIONS } from '@/shared/constants/modules'
import type { Permission } from '@/shared/constants/modules'
import { expandPermissions } from '@/modules/users/lib/permissions'

const fromCodes = (codes: string[]) => expandPermissions(codes) as Permission[]

// Tenant + user fixtures for VITE_USE_MOCKS=true. Device fixtures live with
// the module that owns them, in modules/devices/api/devices.mock.ts — shared/
// shouldn't carry a domain type, and the Device interface was previously
// declared in both places and free to drift.

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

// A second administrator with fewer permissions — the FRD asks for a
// "role-based access foundation", not for site staff to sign in. Use OP-014
// with mocks on to exercise it: the sidebar drops to two entries and the
// landing redirect sends them to /devices rather than a dead-end screen.
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

// Sign in as VIEW-001 for the demo case: Dashboard and Track Playback only.
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

// Sign in as NEW-001 to exercise the forced-change-on-first-login flow.
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
  if (id.startsWith('NEW')) return mockNewStarter
  return mockAdmin
}
