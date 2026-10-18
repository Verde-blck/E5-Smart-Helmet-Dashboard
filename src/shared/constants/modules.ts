// The single source of truth for "what is a module" in this app.
// Sidebar nav, route guards, and the RBAC editor all read from this list —
// so adding a module means adding one entry here, not touching three files.
import type { IconName } from '@/shared/components/ModuleIcon'

export type ModuleKey =
  | 'dashboard'
  | 'devices'
  | 'map'
  | 'trackPlayback'
  | 'groupCall'
  | 'photos'
  | 'videos'
  | 'alarms'
  | 'users'
  | 'unitSettings'
  | 'wifi'
  | 'profile'
  // Permission-only: features inside other pages, with their own backend
  // code but no sidebar entry. See CAPABILITIES below.
  | 'live'
  | 'fences'
  | 'groups'

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
  { key: 'groupCall', label: 'Group Call', route: '/group-call', icon: 'megaphone' },
  { key: 'photos', label: 'Photo Record', route: '/photos', icon: 'photo' },
  { key: 'videos', label: 'Video Record', route: '/videos', icon: 'video' },
  { key: 'alarms', label: 'Alarm Record', route: '/alarms', icon: 'alarm' },
  { key: 'users', label: 'Administrators', route: '/users', icon: 'users' },
  { key: 'unitSettings', label: 'Unit Setting', route: '/unit-setting', icon: 'sliders' },
  // Wi-Fi, SIM and mobile data; replaces the vendor's Anlink app. Key and
  // route stay "wifi" so existing links and permissions keep working.
  { key: 'wifi', label: 'Connectivity', route: '/wifi', icon: 'wifi' },
  { key: 'profile', label: 'Company Profile', route: '/profile', icon: 'building' },
]

export const ACTIONS: Action[] = ['read', 'write', 'delete']

/**
 * Permissions that belong to a feature rather than a page: live view and
 * calls (inside Monitoring Center and each helmet's page), fences (inside
 * Live Map) and groups (inside Group Call). They gate buttons and panels,
 * and never appear in the sidebar.
 */
export const CAPABILITIES: ModuleKey[] = ['live', 'fences', 'groups']

/** Every permission string the system knows about. */
export const ALL_PERMISSIONS: Permission[] = [...MODULES.map((m) => m.key), ...CAPABILITIES].flatMap((key) =>
  ACTIONS.map((a): Permission => `${key}:${a}`)
)
