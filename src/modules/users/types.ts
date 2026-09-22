import type { ApiPermission } from './lib/permissions'

/**
 * An administrator account, matching GET /api/admins exactly.
 *
 * Note what isn't here: roles as entities. `role` and `department` are free
 * text on the account, and permissions attach directly to the administrator
 * rather than to a shared role. The earlier design had roles as reusable
 * permission templates; the backend doesn't model them, so neither do we.
 */
export interface Administrator {
  id: number
  username: string
  department?: string | null
  role?: string | null
  mobilePhone?: string | null
  groupId?: number | null
  permissions: ApiPermission[]
  /** Helmets this administrator is limited to. Empty means no restriction. */
  deviceIds: string[]
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

/** Editing omits the password unless it's being changed. */
export type AdministratorUpdate = Partial<Omit<NewAdministrator, 'password'>> & {
  password?: string
}

export interface Group {
  id: number
  name: string
  createdBy?: string | null
}
