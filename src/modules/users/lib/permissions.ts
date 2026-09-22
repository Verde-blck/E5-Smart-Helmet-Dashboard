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
  /** True when this module isn't built in the dashboard yet. */
  pending?: boolean
}

/**
 * The tree as the reference platform presents it.
 *
 * Task Manager and Fence are both real permissions *and* parents; Set is a
 * grouping with no code of its own. Ticking a parent doesn't imply its
 * children — each is granted separately, which is why they render as
 * independent checkboxes rather than a cascade.
 */
export const PERMISSION_TREE: PermissionNode[] = [
  { label: 'Dashboard', code: 'DASHBOARD' },
  { label: 'Monitoring Center', code: 'MONITORING_CENTER' },
  { label: 'Surveillance', code: 'SURVEILLANCE', pending: true },
  { label: 'Track Playback', code: 'TRACK_PLAYBACK' },
  {
    label: 'Task Manager',
    code: 'TASK_MANAGE',
    pending: true,
    children: [
      { label: 'Task List', code: 'TASK_LIST', pending: true },
      { label: 'Release Task', code: 'RELEASE_TASK', pending: true },
    ],
  },
  { label: 'Group Call', code: 'GROUP_CALL', pending: true },
  {
    label: 'Set',
    children: [
      { label: 'Group Setting', code: 'GROUP_SETTING' },
      { label: 'Administrator Setting', code: 'ADMINISTRATOR_SETTING' },
      { label: 'Unit Setting', code: 'UNIT_SETTING' },
    ],
  },
  {
    label: 'Fence',
    code: 'FENCE',
    pending: true,
    children: [
      { label: 'Geo-fence', code: 'GEO_FENCE', pending: true },
      { label: 'Bluetooth Beacon', code: 'BLUETOOTH_BEACON', pending: true },
    ],
  },
  { label: 'Alarm Record', code: 'ALARM_RECORD' },
  { label: 'Photo Record', code: 'PHOTO_RECORD' },
  { label: 'Video Record', code: 'VIDEO_RECORD' },
  { label: 'Attendance Record', code: 'ATTENDANCE_RECORD', pending: true },
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
