import { ALL_PERMISSIONS } from '@/shared/constants/modules'
import type { ManagedUser, NewUserInput, Role } from '../types'

const HOUR = 60 * 60_000

let roles: Role[] = [
  {
    id: 'role-admin',
    name: 'Admin',
    description: 'Full access, including user and role management.',
    permissions: ALL_PERMISSIONS,
    isSystem: true,
    userCount: 1,
    allSites: true,
  },
  {
    id: 'role-response',
    name: 'Alarm response',
    description: 'Monitors the fleet and acknowledges safety events.',
    permissions: [
      'dashboard:read',
      'devices:read',
      'map:read',
      'alarms:read',
      'alarms:write',
      'photos:read',
      'videos:read',
      'profile:read',
    ],
    isSystem: false,
    userCount: 2,
    allSites: false,
  },
  {
    id: 'role-monitoring',
    name: 'Monitoring',
    description: 'Read-only view of devices and alarms.',
    permissions: ['devices:read', 'map:read', 'alarms:read'],
    isSystem: false,
    userCount: 3,
    allSites: false,
  },
]

let users: ManagedUser[] = [
  { id: 'user-1', username: 'ADM-001', name: 'NG_David', email: 'david@example.com', phone: '+234 801 234 5678', assignedSite: 'Site A', roleId: 'role-admin', status: 'active', lastActiveAt: Date.now() - 4 * 60_000 },
  { id: 'user-2', username: 'OP-014', name: 'Site Operator', email: 'operator@example.com', assignedSite: 'Site B', roleId: 'role-monitoring', status: 'active', lastActiveAt: Date.now() - 2 * HOUR },
  { id: 'user-3', username: 'SUP-002', name: 'Amaka Obi', email: 'amaka@example.com', phone: '+234 802 987 6543', assignedSite: 'Site A', roleId: 'role-response', status: 'active', lastActiveAt: Date.now() - 26 * HOUR },
  { id: 'user-4', username: 'SUP-007', name: 'Tunde Bello', assignedSite: 'Site C', roleId: 'role-response', status: 'active', lastActiveAt: Date.now() - 5 * HOUR },
  { id: 'user-5', username: 'NEW-001', name: 'Chidi Eze', assignedSite: 'Site B', roleId: 'role-monitoring', status: 'invited', mustChangePassword: true },
  { id: 'user-6', username: 'OP-021', name: 'Fatima Sani', phone: '+234 803 111 2222', assignedSite: 'Site C', roleId: 'role-monitoring', status: 'disabled' },
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
    allSites: false,
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

export function createMockUser(input: NewUserInput): ManagedUser {
  const user: ManagedUser = {
    id: `user-${Date.now()}`,
    username: input.username,
    name: input.name,
    email: input.email || undefined,
    phone: input.phone || undefined,
    assignedSite: input.assignedSite || undefined,
    roleId: input.roleId,
    status: 'invited',
    // Every admin-created account starts flagged. The password the
    // administrator just typed is known by two people until it's replaced.
    mustChangePassword: true,
  }
  users = [...users, user]
  recount()
  return { ...user }
}

export function updateMockUser(id: string, patch: Partial<ManagedUser>): ManagedUser {
  users = users.map((u) => (u.id === id ? { ...u, ...patch, id: u.id } : u))
  recount()
  return getMockUsers().find((u) => u.id === id) as ManagedUser
}

export function resetMockPassword(id: string): ManagedUser {
  return updateMockUser(id, { mustChangePassword: true })
}

export function usernameTaken(username: string, exceptId?: string): boolean {
  const wanted = username.trim().toUpperCase()
  return users.some((u) => u.id !== exceptId && u.username.toUpperCase() === wanted)
}
