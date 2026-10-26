import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { DEFAULT_SETTINGS } from '../types'
import type { AlarmSwitches, HelmetSettings, SaveResult, UploadMethod } from '../types'

type ApiSettings = Record<string, unknown>

const FIELD_MAP = {
  heartbeatSeconds: 'beatTime',
  alarmTemperatureC: 'alarmTemperature',
  shutdownTemperatureC: 'shutdownTemperature',
  nearElectricVoltage: 'nearElectricAlarmVoltage',
  hatOffDelaySeconds: 'hatOffDelayAlarmTime',
  silenceDetectionMinutes: 'silenceDetectionMinutes',
  hatOffDetectionMinutes: 'hatOffDetectionMinutes',
  broadcastLanguage: 'hookBroadcastLanguage',
  localRecording: 'enableLocalRecord',
  bluetoothBeaconScan: 'bluetoothBeaconScanSwitch',
  uploadMethod: 'uploadMethod',
  pictureQuality: 'pictureQuality',
  videoSplit: 'videoSplitting',
  videoSplitMinutes: 'videoSplitMinutes',
} as const satisfies Record<Exclude<keyof HelmetSettings, 'alarms'>, string>

const ALARM_MAP = {
  hatOff: 'hatOffAlarm',
  fence: 'fenceAlarm',
  temperature: 'temperatureAlarm',
  drop: 'dropAlarm',
  collision: 'collisionAlarm',
  silent: 'silentAlarm',
  nearElectric: 'nearElectricAlarm',
  ascending: 'ascendingAlarm',
  lowBattery: 'lowBatteryRemind',
  localRecordingReminder: 'localRecordingRemind',
  sos: 'sos',
} as const satisfies Record<keyof AlarmSwitches, string>

const UPLOAD_METHODS: readonly UploadMethod[] = ['none', '4g', 'wifi']

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function toBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 1 || value === '1') return true
  if (value === 'false' || value === 0 || value === '0') return false
  return fallback
}

function toText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback
}

function fromApi(raw: ApiSettings): HelmetSettings {
  const d = DEFAULT_SETTINGS
  const num = (key: string, fallback: number) => toNumber(raw[key]) ?? fallback
  const upload = String(raw[FIELD_MAP.uploadMethod] ?? '').toLowerCase()

  const alarms = {} as AlarmSwitches
  for (const [ours, theirs] of Object.entries(ALARM_MAP) as [keyof AlarmSwitches, string][]) {
    alarms[ours] = toBool(raw[theirs], d.alarms[ours])
  }

  return {
    heartbeatSeconds: num(FIELD_MAP.heartbeatSeconds, d.heartbeatSeconds),
    alarmTemperatureC: toNumber(raw[FIELD_MAP.alarmTemperatureC]),
    shutdownTemperatureC: toNumber(raw[FIELD_MAP.shutdownTemperatureC]),
    nearElectricVoltage: num(FIELD_MAP.nearElectricVoltage, d.nearElectricVoltage),
    hatOffDelaySeconds: num(FIELD_MAP.hatOffDelaySeconds, d.hatOffDelaySeconds),
    silenceDetectionMinutes: num(FIELD_MAP.silenceDetectionMinutes, d.silenceDetectionMinutes),
    hatOffDetectionMinutes: num(FIELD_MAP.hatOffDetectionMinutes, d.hatOffDetectionMinutes),
    broadcastLanguage: toText(raw[FIELD_MAP.broadcastLanguage], d.broadcastLanguage),
    localRecording: toBool(raw[FIELD_MAP.localRecording], d.localRecording),
    bluetoothBeaconScan: toBool(raw[FIELD_MAP.bluetoothBeaconScan], d.bluetoothBeaconScan),
    uploadMethod: (UPLOAD_METHODS as readonly string[]).includes(upload)
      ? (upload as UploadMethod)
      : d.uploadMethod,
    pictureQuality: toText(raw[FIELD_MAP.pictureQuality], d.pictureQuality),
    videoSplit: toBool(raw[FIELD_MAP.videoSplit], d.videoSplit),
    videoSplitMinutes: num(FIELD_MAP.videoSplitMinutes, d.videoSplitMinutes),
    alarms,
  }
}

function changesToApi(
  before: HelmetSettings,
  after: HelmetSettings,
  rawTypes: Map<string, string>
): ApiSettings {
  const body: ApiSettings = {}
  const put = (theirs: string, value: unknown) => {
    if (typeof value === 'number' && rawTypes.get(theirs) === 'string') body[theirs] = String(value)
    else if (value === null) body[theirs] = rawTypes.get(theirs) === 'string' ? '' : null
    else body[theirs] = value
  }

  for (const [ours, theirs] of Object.entries(FIELD_MAP) as [Exclude<keyof HelmetSettings, 'alarms'>, string][]) {
    if (before[ours] !== after[ours]) put(theirs, after[ours])
  }
  for (const [ours, theirs] of Object.entries(ALARM_MAP) as [keyof AlarmSwitches, string][]) {
    if (before.alarms[ours] !== after.alarms[ours]) put(theirs, after.alarms[ours])
  }
  return body
}

const rawTypesByDevice = new Map<string, Map<string, string>>()

const mockStore = new Map<string, HelmetSettings>()
let mockDeliverNext = false

function cloneSettings(s: HelmetSettings): HelmetSettings {
  return { ...s, alarms: { ...s.alarms } }
}

export async function fetchHelmetSettings(deviceId: string): Promise<HelmetSettings> {
  if (env.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 250))
    return cloneSettings(mockStore.get(deviceId) ?? DEFAULT_SETTINGS)
  }

  const { data } = await apiClient.get<ApiSettings>(`/devices/${deviceId}/settings`)
  rawTypesByDevice.set(
    deviceId,
    new Map(Object.entries(data ?? {}).map(([key, value]) => [key, typeof value]))
  )
  return fromApi(data ?? {})
}

// Send only changes: a missing field means keep, so the full object would overwrite edits made
// elsewhere.
export async function saveHelmetSettings(
  deviceId: string,
  before: HelmetSettings,
  after: HelmetSettings
): Promise<SaveResult> {
  if (env.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 400))
    mockStore.set(deviceId, cloneSettings(after))
    mockDeliverNext = !mockDeliverNext
    return { settings: cloneSettings(after), delivered: !mockDeliverNext, appliesAfterRestart: true }
  }

  const body = changesToApi(before, after, rawTypesByDevice.get(deviceId) ?? new Map())
  if (Object.keys(body).length === 0) return { settings: before, delivered: true, appliesAfterRestart: false }

  const { data } = await apiClient.put<{ saved?: boolean; delivered?: boolean; appliesAfterRestart?: boolean }>(
    `/devices/${deviceId}/settings`,
    body
  )
  if (data?.saved === false) throw new Error('The backend reported the settings were not saved')
  return {
    settings: cloneSettings(after),
    delivered: data?.delivered === true,
    appliesAfterRestart: data?.appliesAfterRestart !== false,
  }
}
