import { ALL_PERMISSIONS } from '@/shared/constants/modules'
import type { ManagedUser, Role } from '../types'

const HOUR = 60 * 60_000

let roles: Role[] = [
  {
    id: 'role-admin',
    name: 'Admin',
    description: 'Full access, including user and role management.',
    permissions: ALL_PERMISSIONS,
    isSystem: true,
    userCount: 1,
  },
  {
    id: 'role-supervisor',
    name: 'Supervisor',
    description: 'Monitors the fleet and responds to alarms.',
    permissions: [
      'dashboard:read',
      'devices:read',
      'alarms:read',
      'alarms:write',
      'media:read',
      'profile:read',
    ],
    isSystem: false,
    userCount: 2,
  },
  {
    id: 'role-operator',
    name: 'Operator',
    description: 'Device monitoring only.',
    permissions: ['devices:read', 'alarms:read'],
    isSystem: false,
    userCount: 3,
  },
]

let users: ManagedUser[] = [
  { id: 'user-1', name: 'NG_David', email: 'david@example.com', roleId: 'role-admin', status: 'active', lastActiveAt: Date.now() - 4 * 60_000 },
  { id: 'user-2', name: 'Site Operator', email: 'operator@example.com', roleId: 'role-operator', status: 'active', lastActiveAt: Date.now() - 2 * HOUR },
  { id: 'user-3', name: 'Amaka Obi', email: 'amaka@example.com', roleId: 'role-supervisor', status: 'active', lastActiveAt: Date.now() - 26 * HOUR },
  { id: 'user-4', name: 'Tunde Bello', email: 'tunde@example.com', roleId: 'role-supervisor', status: 'active', lastActiveAt: Date.now() - 5 * HOUR },
  { id: 'user-5', name: 'Chidi Eze', email: 'chidi@example.com', roleId: 'role-operator', status: 'invited' },
  { id: 'user-6', name: 'Fatima Sani', email: 'fatima@example.com', roleId: 'role-operator', status: 'disabled' },
]

function recount() {
  roles = roles.map((role) => ({
    ...role,
    userCount: users.filter((u) => u.roleId === role.id).length,
  }))
}
recount()

export function getMockRoles(): Role[] {
  return roles.map((r) => ({ ...r, permissions: [...r.permissions] }))
}

export function getMockUsers(): ManagedUser[] {
  return users.map((u) => ({ ...u }))
}

export function updateMockRole(id: string, patch: Partial<Role>): Role {
  roles = roles.map((role) => (role.id === id ? { ...role, ...patch, id: role.id } : role))
  recount()
  return getMockRoles().find((r) => r.id === id) as Role
}

export function createMockRole(name: string): Role {
  const role: Role = {
    id: `role-${Date.now()}`,
    name,
    description: '',
    permissions: ['dashboard:read'],
    isSystem: false,
    userCount: 0,
  }
  roles = [...roles, role]
  return { ...role }
}

export function deleteMockRole(id: string): void {
  roles = roles.filter((role) => role.id !== id)
}

export function assignMockRole(userId: string, roleId: string): ManagedUser {
  users = users.map((user) => (user.id === userId ? { ...user, roleId } : user))
  recount()
  return getMockUsers().find((u) => u.id === userId) as ManagedUser
}
