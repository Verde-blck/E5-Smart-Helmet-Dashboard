/**
 * Per-helmet configuration, pushed down to the device.
 *
 * This is the dashboard's own shape, with units in the names and the alarm
 * switches grouped. The backend's field names differ (beatTime,
 * enableLocalRecord, hatOffAlarm and so on); the translation both ways lives
 * in api/unit-settings.api.ts, so nothing else in the module sees them.
 *
 * The helmet's HTTP request address and long link address are deliberately
 * absent. They decide which server the helmet reports to at all, so editing
 * one by mistake would silently cut a helmet off from this dashboard. They
 * stay on the manufacturer's platform, where the redirect was set up.
 */

export type UploadMethod = 'none' | '4g' | 'wifi'

/**
 * Free text on the backend ("Chinese" in its own example), so kept as a
 * string: a value the list below doesn't know is shown rather than lost.
 */
export type BroadcastLanguage = string

/**
 * Also free text on the backend, whose allowed values come from the device
 * documentation. The options below are the reference platform's two levels;
 * the exact strings the helmet expects still need confirming.
 */
export type PictureQuality = string

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
  // --- Reporting --------------------------------------------------------
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

/** Outcome of a save: stored, and whether the helmet received it straight away. */
export interface SaveResult {
  settings: HelmetSettings
  /**
   * True when the helmet was online and got the change immediately; false
   * when it's queued for the helmet's next reconnect. Neither confirms the
   * helmet has applied it; that is still unverified with the manufacturer.
   */
  delivered: boolean
}

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

/**
 * Fallbacks for any field the backend leaves out, and the starting values in
 * mock mode. The backend has its own defaults (most alarms on), which win
 * whenever it sends a value.
 */
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
