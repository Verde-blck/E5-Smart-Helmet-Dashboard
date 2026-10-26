import type { ApiPermission } from './lib/permissions'

export interface Administrator {
  id: number
  username: string
  department?: string | null
  role?: string | null
  mobilePhone?: string | null
  groupId?: number | null
  permissions: ApiPermission[]
  deviceIds: string[]
  superAdmin?: boolean
  twoFactorEnabled?: boolean
}

export interface NewAdministrator {
  username: string
  password: string
  department?: string
  role?: string
  mobilePhone?: string
  groupId?: number | null
  permissions: ApiPermission[]
  deviceIds: string[]
}

export type AdministratorUpdate = Partial<Omit<NewAdministrator, 'password'>> & {
  password?: string
}

export interface Group {
  id: number
  name: string
  createdBy?: string | null
}
