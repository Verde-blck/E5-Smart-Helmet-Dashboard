// The single source of truth for "what is a module" in this app.
// Sidebar nav, route guards, and the RBAC editor all read from this list —
// so adding a module means adding one entry here, not touching three files.
export type ModuleKey =
  | 'dashboard'
  | 'devices'
  | 'map'
  | 'photos'
  | 'videos'
  | 'alarms'
  | 'users'
  | 'profile'

// Permissions are module + action, not just module. A supervisor who can view
// users but not create them, or watch recordings but not delete them, has no
// representation in a bare ModuleKey[] — and widening it later touches the
// route guard, the sidebar, the role editor and the backend contract at once.
export type Action = 'read' | 'write' | 'delete'
export type Permission = `${ModuleKey}:${Action}`

export interface ModuleDef {
  key: ModuleKey
  label: string
  route: string
  icon: string // icon name, wire up to your icon set of choice
}

export const MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Dashboard', route: '/', icon: 'layout-dashboard' },
  { key: 'devices', label: 'Devices', route: '/devices', icon: 'cpu' },
  { key: 'map', label: 'Live Map', route: '/map', icon: 'map-pin' },
  { key: 'photos', label: 'Photo Record', route: '/photos', icon: 'photo' },
  { key: 'videos', label: 'Video Record', route: '/videos', icon: 'video' },
  { key: 'alarms', label: 'Alarms', route: '/alarms', icon: 'alert-triangle' },
  { key: 'users', label: 'Administrators', route: '/users', icon: 'users' },
  { key: 'profile', label: 'Company Profile', route: '/profile', icon: 'building' },
]

export const ACTIONS: Action[] = ['read', 'write', 'delete']

/** Every permission string the system knows about — the RoleEditor matrix. */
export const ALL_PERMISSIONS: Permission[] = MODULES.flatMap((m) =>
  ACTIONS.map((a): Permission => `${m.key}:${a}`)
)
