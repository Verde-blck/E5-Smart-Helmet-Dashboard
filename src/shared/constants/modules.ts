// The single source of truth for "what is a module" in this app.
// Sidebar nav, route guards, and the RBAC editor all read from this list —
// so adding a module means adding one entry here, not touching three files.
import type { IconName } from '@/shared/components/ModuleIcon'

export type ModuleKey =
  | 'dashboard'
  | 'devices'
  | 'map'
  | 'trackPlayback'
  | 'photos'
  | 'videos'
  | 'alarms'
  | 'users'
  | 'unitSettings'
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
  icon: IconName
}

export const MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Dashboard', route: '/', icon: 'dashboard' },
  // Labelled Monitoring Center to match the vendor's console, which is what
  // the client already recognises. The module key stays `devices` so every
  // permission string and route keeps working.
  { key: 'devices', label: 'Monitoring Center', route: '/devices', icon: 'monitoring' },
  { key: 'map', label: 'Live Map', route: '/map', icon: 'map' },
  { key: 'trackPlayback', label: 'Track Playback', route: '/track-playback', icon: 'route' },
  { key: 'photos', label: 'Photo Record', route: '/photos', icon: 'photo' },
  { key: 'videos', label: 'Video Record', route: '/videos', icon: 'video' },
  { key: 'alarms', label: 'Alarm Record', route: '/alarms', icon: 'alarm' },
  { key: 'users', label: 'Administrators', route: '/users', icon: 'users' },
  { key: 'unitSettings', label: 'Unit Setting', route: '/unit-setting', icon: 'sliders' },
  { key: 'profile', label: 'Company Profile', route: '/profile', icon: 'building' },
]

export const ACTIONS: Action[] = ['read', 'write', 'delete']

/** Every permission string the system knows about — the RoleEditor matrix. */
export const ALL_PERMISSIONS: Permission[] = MODULES.flatMap((m) =>
  ACTIONS.map((a): Permission => `${m.key}:${a}`)
)
