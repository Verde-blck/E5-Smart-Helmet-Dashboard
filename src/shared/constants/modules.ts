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
  { key: 'devices', label: 'Monitoring Center', route: '/devices', icon: 'monitoring' },
  { key: 'map', label: 'Live Map', route: '/map', icon: 'map' },
  { key: 'trackPlayback', label: 'Track Playback', route: '/track-playback', icon: 'route' },
  { key: 'groupCall', label: 'Group Call', route: '/group-call', icon: 'megaphone' },
  { key: 'photos', label: 'Photo Record', route: '/photos', icon: 'photo' },
  { key: 'videos', label: 'Video Record', route: '/videos', icon: 'video' },
  { key: 'alarms', label: 'Alarm Record', route: '/alarms', icon: 'alarm' },
  { key: 'users', label: 'Administrators', route: '/users', icon: 'users' },
  { key: 'unitSettings', label: 'Unit Setting', route: '/unit-setting', icon: 'sliders' },
  { key: 'wifi', label: 'Connectivity', route: '/wifi', icon: 'wifi' },
  { key: 'profile', label: 'Company Profile', route: '/profile', icon: 'building' },
]

export const ACTIONS: Action[] = ['read', 'write', 'delete']

export const CAPABILITIES: ModuleKey[] = ['live', 'fences', 'groups']

export const ALL_PERMISSIONS: Permission[] = [...MODULES.map((m) => m.key), ...CAPABILITIES].flatMap((key) =>
  ACTIONS.map((a): Permission => `${key}:${a}`)
)
