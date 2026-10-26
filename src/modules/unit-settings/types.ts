export type UploadMethod = 'none' | '4g' | 'wifi'

export type BroadcastLanguage = string

export type PictureQuality = string

export interface AlarmSwitches {
  hatOff: boolean
  fence: boolean
  temperature: boolean
  drop: boolean
  collision: boolean
  silent: boolean
  nearElectric: boolean
  ascending: boolean
  lowBattery: boolean
  localRecordingReminder: boolean
  sos: boolean
}

export interface HelmetSettings {
  heartbeatSeconds: number

  alarmTemperatureC: number | null
  shutdownTemperatureC: number | null
  nearElectricVoltage: number
  hatOffDelaySeconds: number
  silenceDetectionMinutes: number
  hatOffDetectionMinutes: number

  broadcastLanguage: BroadcastLanguage
  localRecording: boolean
  bluetoothBeaconScan: boolean
  uploadMethod: UploadMethod
  pictureQuality: PictureQuality
  videoSplit: boolean
  videoSplitMinutes: number

  alarms: AlarmSwitches
}

export interface SaveResult {
  settings: HelmetSettings
  delivered: boolean
  appliesAfterRestart: boolean
}

export const SPLIT_MINUTES = [10, 20, 30] as const

export const UPLOAD_METHODS: { value: UploadMethod; label: string; note?: string }[] = [
  { value: 'none', label: 'Do not upload automatically', note: 'Footage stays on the helmet until collected' },
  { value: '4g', label: 'Upload when 4G is available', note: 'Uses the SIM — watch the data cost' },
  { value: 'wifi', label: 'Upload when Wi-Fi is available', note: 'Uploads only back at base' },
]

export const PICTURE_QUALITIES: { value: PictureQuality; label: string }[] = [
  { value: 'HD', label: 'HD' },
  { value: 'Ultra-clear', label: 'Ultra-clear' },
]

export const BROADCAST_LANGUAGES: { value: BroadcastLanguage; label: string }[] = [
  { value: 'English', label: 'English' },
  { value: 'Chinese', label: 'Chinese' },
]

export const ALARM_LABELS: { key: keyof AlarmSwitches; label: string; critical?: boolean }[] = [
  { key: 'sos', label: 'SOS', critical: true },
  { key: 'drop', label: 'Drop / fall alarm', critical: true },
  { key: 'collision', label: 'Collision alarm', critical: true },
  { key: 'nearElectric', label: 'Near-electric alarm', critical: true },
  { key: 'silent', label: 'Silent alarm', critical: true },
  { key: 'hatOff', label: 'Hat-off alarm' },
  { key: 'fence', label: 'Fence alarm' },
  { key: 'temperature', label: 'Temperature alarm' },
  { key: 'ascending', label: 'Ascending alarm' },
  { key: 'lowBattery', label: 'Low battery reminder' },
  { key: 'localRecordingReminder', label: 'Local recording reminder' },
]

export const DEFAULT_SETTINGS: HelmetSettings = {
  heartbeatSeconds: 30,
  alarmTemperatureC: null,
  shutdownTemperatureC: null,
  nearElectricVoltage: 1,
  hatOffDelaySeconds: 10,
  silenceDetectionMinutes: 45,
  hatOffDetectionMinutes: 45,
  broadcastLanguage: 'English',
  localRecording: false,
  bluetoothBeaconScan: false,
  uploadMethod: 'none',
  pictureQuality: 'HD',
  videoSplit: false,
  videoSplitMinutes: 10,
  alarms: {
    hatOff: true,
    fence: true,
    temperature: true,
    drop: true,
    collision: true,
    silent: true,
    nearElectric: true,
    ascending: true,
    lowBattery: true,
    localRecordingReminder: true,
    sos: true,
  },
}
