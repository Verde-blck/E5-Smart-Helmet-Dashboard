import type { Administrator, AdministratorUpdate, Group, NewAdministrator } from '../types'

let admins: Administrator[] = [
  {
    id: 1,
    username: 'admin',
    department: null,
    role: null,
    mobilePhone: null,
    groupId: null,
    // Matches the live backend, where the seeded account holds no explicit
    // permissions — see the note in AdminList about why that isn't enforced.
    permissions: [],
    deviceIds: [],
  },
  {
    id: 2,
    username: 'joseph',
    department: 'Operations',
    role: 'Supervisor',
    mobilePhone: '08012345678',
    groupId: 1,
    permissions: ['DASHBOARD', 'ALARM_RECORD', 'MONITORING_CENTER'],
    deviceIds: ['866652022956404'],
  },
  {
    id: 3,
    username: 'amaka',
    department: 'Safety',
    role: 'Safety officer',
    mobilePhone: '08029876543',
    groupId: 2,
    permissions: ['DASHBOARD', 'ALARM_RECORD', 'PHOTO_RECORD', 'VIDEO_RECORD'],
    deviceIds: [],
  },
]

let groups: Group[] = [
  { id: 1, name: 'test', createdBy: 'admin' },
  { id: 2, name: 'Joseph', createdBy: 'admin' },
  { id: 3, name: 'WALE', createdBy: 'admin' },
]

let nextAdminId = 4
let nextGroupId = 4

export function getMockAdmins(): Administrator[] {
  return admins.map((a) => ({ ...a, permissions: [...a.permissions], deviceIds: [...a.deviceIds] }))
}

export function createMockAdmin(input: NewAdministrator): Administrator {
  const admin: Administrator = {
    id: nextAdminId++,
    username: input.username,
    department: input.department ?? null,
    role: input.role ?? null,
    mobilePhone: input.mobilePhone ?? null,
    groupId: input.groupId ?? null,
    permissions: [...input.permissions],
    deviceIds: [...input.deviceIds],
  }
  admins = [...admins, admin]
  return { ...admin }
}

export function updateMockAdmin(id: number, patch: AdministratorUpdate): Administrator {
  admins = admins.map((a) =>
    a.id === id
      ? {
          ...a,
          ...patch,
          id: a.id,
          username: patch.username ?? a.username,
          permissions: patch.permissions ? [...patch.permissions] : a.permissions,
          deviceIds: patch.deviceIds ? [...patch.deviceIds] : a.deviceIds,
        }
      : a
  )
  return getMockAdmins().find((a) => a.id === id) as Administrator
}

export function deleteMockAdmin(id: number): void {
  admins = admins.filter((a) => a.id !== id)
}

export function getMockGroups(): Group[] {
  return groups.map((g) => ({ ...g }))
}

export function createMockGroup(name: string): Group {
  const group: Group = { id: nextGroupId++, name, createdBy: 'admin' }
  groups = [...groups, group]
  return { ...group }
}

export function updateMockGroup(id: number, name: string): Group {
  groups = groups.map((g) => (g.id === id ? { ...g, name } : g))
  return groups.find((g) => g.id === id) as Group
}

export function deleteMockGroup(id: number): void {
  groups = groups.filter((g) => g.id !== id)
  // Mirrors the dangling reference seen on the live backend: deleting a group
  // leaves admins still pointing at it. The list surfaces that rather than
  // hiding it.
}
