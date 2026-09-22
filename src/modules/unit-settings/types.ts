/**
 * Per-helmet configuration, pushed down to the device.
 *
 * Field names and units are taken from the reference platform's Unit Setting
 * screen. There is no API for this yet — this shape is the contract proposed
 * to the backend, so the form and the endpoint are built against the same
 * thing rather than meeting in the middle later.
 */

export type UploadMethod = 'manual' | '4g' | 'wifi'
export type PictureQuality = 'hd' | 'ultra'
export type BroadcastLanguage = 'en' | 'zh'

/**
 * The alarms the helmet can raise, and whether each is armed.
 *
 * These map one-to-one onto the alarm types in the Alarm Record: turning one
 * off here means the helmet stops raising it, so it will never appear in the
 * event log. That link is worth stating in the UI — it is otherwise very easy
 * to disable an alarm here and later conclude the alarm feed is broken.
 */
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
  // --- Connection -------------------------------------------------------
  httpAddress: string
  longLinkAddress: string
  /** BEATTIM — how often the helmet reports in, in seconds. */
  heartbeatSeconds: number

  // --- Detection thresholds --------------------------------------------
  alarmTemperatureC: number | null
  shutdownTemperatureC: number | null
  /** Volts. Proximity threshold for the near-electric alarm. */
  nearElectricVoltage: number
  /** Grace period before a removed helmet raises an alarm. */
  hatOffDelaySeconds: number
  /** Minutes of no movement before the silent alarm fires. */
  silenceDetectionMinutes: number
  /** Minutes the helmet must be off before it's considered removed. */
  hatOffDetectionMinutes: number

  // --- Capture and upload ----------------------------------------------
  broadcastLanguage: BroadcastLanguage
  localRecording: boolean
  bluetoothBeaconScan: boolean
  uploadMethod: UploadMethod
  pictureQuality: PictureQuality
  /** Split long recordings into segments rather than one large file. */
  videoSplit: boolean

  alarms: AlarmSwitches
}

export const UPLOAD_METHODS: { value: UploadMethod; label: string; note?: string }[] = [
  { value: 'manual', label: 'Do not upload automatically', note: 'Footage stays on the helmet until collected' },
  { value: '4g', label: 'Upload when 4G is available', note: 'Uses the SIM — watch the data cost' },
  { value: 'wifi', label: 'Upload when Wi-Fi is available', note: 'Uploads only back at base' },
]

export const PICTURE_QUALITIES: { value: PictureQuality; label: string }[] = [
  { value: 'hd', label: 'HD' },
  { value: 'ultra', label: 'Ultra-clear' },
]

export const BROADCAST_LANGUAGES: { value: BroadcastLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: 'Chinese' },
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

/** What a helmet ships with, and what an unconfigured device reports. */
export const DEFAULT_SETTINGS: HelmetSettings = {
  httpAddress: '',
  longLinkAddress: '',
  heartbeatSeconds: 30,
  alarmTemperatureC: null,
  shutdownTemperatureC: null,
  nearElectricVoltage: 1,
  hatOffDelaySeconds: 10,
  silenceDetectionMinutes: 45,
  hatOffDetectionMinutes: 45,
  broadcastLanguage: 'en',
  localRecording: false,
  bluetoothBeaconScan: false,
  uploadMethod: 'manual',
  pictureQuality: 'hd',
  videoSplit: false,
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
