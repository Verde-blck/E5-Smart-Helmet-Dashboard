import type { ModuleKey } from '@/shared/constants/modules'

/**
 * The permission codes the backend defines, verified against GET /api/permissions.
 *
 * Flat and module-level — there is no read/write/delete distinction. Holding
 * a permission means full access to that module.
 */
export type ApiPermission =
  | 'DASHBOARD'
  | 'MONITORING_CENTER'
  | 'SURVEILLANCE'
  | 'TRACK_PLAYBACK'
  | 'TASK_MANAGE'
  | 'TASK_LIST'
  | 'RELEASE_TASK'
  | 'GROUP_CALL'
  | 'GROUP_SETTING'
  | 'ADMINISTRATOR_SETTING'
  | 'UNIT_SETTING'
  | 'FENCE'
  | 'GEO_FENCE'
  | 'BLUETOOTH_BEACON'
  | 'ALARM_RECORD'
  | 'PHOTO_RECORD'
  | 'VIDEO_RECORD'
  | 'ATTENDANCE_RECORD'

export interface PermissionNode {
  label: string
  /** Absent for a grouping that exists only in the form — "Set" has no code. */
  code?: ApiPermission
  children?: PermissionNode[]
}

/**
 * The permissions an administrator can actually be granted.
 *
 * Deliberately shorter than the backend's catalogue. GET /api/permissions
 * offers eighteen codes, including modules this dashboard has no screen for —
 * Surveillance, Task Manager, Group Call, Fence, Bluetooth Beacon and
 * Attendance Record. Offering them would let an administrator grant access to
 * something that does not exist, which is worse than not offering them.
 *
 * To restore one when its module is built: add a node here and map it in
 * MODULE_PERMISSION below. Nothing else needs to change.
 *
 * "Set" is a grouping with no code of its own, matching the reference
 * platform. Ticking a parent does not imply its children — each is granted
 * separately, and the API stores them as a flat list.
 */
export const PERMISSION_TREE: PermissionNode[] = [
  { label: 'Dashboard', code: 'DASHBOARD' },
  { label: 'Monitoring Center', code: 'MONITORING_CENTER' },
  { label: 'Track Playback', code: 'TRACK_PLAYBACK' },
  {
    label: 'Set',
    children: [
      { label: 'Group Setting', code: 'GROUP_SETTING' },
      { label: 'Administrator Setting', code: 'ADMINISTRATOR_SETTING' },
      { label: 'Unit Setting', code: 'UNIT_SETTING' },
    ],
  },
  { label: 'Alarm Record', code: 'ALARM_RECORD' },
  { label: 'Photo Record', code: 'PHOTO_RECORD' },
  { label: 'Video Record', code: 'VIDEO_RECORD' },
]

export function allPermissionCodes(): ApiPermission[] {
  const codes: ApiPermission[] = []
  const walk = (nodes: PermissionNode[]) => {
    for (const node of nodes) {
      if (node.code) codes.push(node.code)
      if (node.children) walk(node.children)
    }
  }
  walk(PERMISSION_TREE)
  return codes
}

/**
 * Which backend permission gates each module in this dashboard.
 *
 * Two of ours have no counterpart. `map` shares MONITORING_CENTER, because a
 * live position map is part of monitoring rather than a separate feature in
 * their model. `profile` — the white-label settings — has no equivalent at
 * all, so it follows ADMINISTRATOR_SETTING as the nearest administrative
 * screen. Worth confirming rather than leaving as a guess.
 */
export const MODULE_PERMISSION: Record<ModuleKey, ApiPermission> = {
  dashboard: 'DASHBOARD',
  devices: 'MONITORING_CENTER',
  map: 'MONITORING_CENTER',
  trackPlayback: 'TRACK_PLAYBACK',
  photos: 'PHOTO_RECORD',
  videos: 'VIDEO_RECORD',
  alarms: 'ALARM_RECORD',
  users: 'ADMINISTRATOR_SETTING',
  unitSettings: 'UNIT_SETTING',
  profile: 'ADMINISTRATOR_SETTING',
}

/**
 * Expands the backend's module-level permissions into the action-level ones
 * the dashboard's guards are written against.
 *
 * Since the API grants whole modules, every granted module yields all three
 * actions. Keeping the internal shape meant nothing downstream had to change
 * when the backend's model turned out flatter than ours — and if the API ever
 * gains actions, only this function tightens.
 */
export function expandPermissions(granted: string[]): string[] {
  const held = new Set(granted)
  const expanded: string[] = []

  for (const [moduleKey, code] of Object.entries(MODULE_PERMISSION)) {
    if (held.has(code)) {
      expanded.push(`${moduleKey}:read`, `${moduleKey}:write`, `${moduleKey}:delete`)
    }
  }

  return [...new Set(expanded)]
}
