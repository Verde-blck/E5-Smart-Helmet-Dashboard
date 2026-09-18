import type { AuthUser, TenantConfig } from '@/shared/store/authStore'
import { ALL_PERMISSIONS } from '@/shared/constants/modules'

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
  staffId: 'ADM-001',
  name: 'NG_David',
  email: 'david@example.com',
  role: 'Admin',
  permissions: ALL_PERMISSIONS,
  scope: { allSites: true, sites: [] },
}

// The brief's own example role: device monitoring only, no user management.
// Sign in as OP-014 with mocks on to exercise it — the sidebar drops to two
// entries and the landing redirect sends them to /devices instead of a
// dead-end "Not authorized" screen.
export const mockOperator: AuthUser = {
  id: 'user-2',
  staffId: 'OP-014',
  name: 'Site Operator',
  email: 'operator@example.com',
  role: 'Operator',
  permissions: ['devices:read', 'alarms:read'],
  scope: { allSites: false, sites: ['Site B'] },
}

// Sign in as NEW-001 to exercise the forced-change-on-first-login flow.
export const mockNewStarter: AuthUser = {
  id: 'user-5',
  staffId: 'NEW-001',
  name: 'Chidi Eze',
  role: 'Operator',
  permissions: ['devices:read', 'alarms:read'],
  mustChangePassword: true,
  scope: { allSites: false, sites: ['Site B'] },
}

export function mockUserFor(staffId: string): AuthUser {
  const id = staffId.trim().toUpperCase()
  if (id.startsWith('OP')) return mockOperator
  if (id.startsWith('NEW')) return mockNewStarter
  return mockAdmin
}
