import type {
  ConnectivityType,
  Device,
  DeviceAssignment,
  HistoryRange,
  TelemetrySample,
  TelemetryWindow,
} from '../types'
import { HISTORY_RANGES } from '../lib/history'
import type { AlarmSeverity } from '@/modules/alarms/types'

// A 15-helmet fleet so the whole app is browsable with VITE_USE_MOCKS=true and
// no backend running. Held as mutable state rather than a frozen array so the
// simulated heartbeats in app/realtime/mock-heartbeats.ts and a React Query
// refetch can't disagree about what the fleet looks like.

const NAMES = [
  'Tom_Dave', 'Joseph', 'WALE', 'lukman', 'Sarah_K', 'MikeO', 'ChenL', 'Priya',
  'Ahmed', 'Grace', 'Victor', 'Ngozi', 'Femi', 'Ibrahim', 'Ola',
]

const SITES = ['Site A', 'Site B', 'Site C']

const WEARERS: (DeviceAssignment | undefined)[] = [
  { name: 'Tom Adewale', phone: '+234 801 445 9921', jobTitle: 'Rigger' },
  { name: 'Joseph Eze', phone: '+234 802 118 3374', jobTitle: 'Site foreman' },
  { name: 'Wale Balogun', phone: '+234 803 662 7781', jobTitle: 'Welder' },
  { name: 'Lukman Yusuf', jobTitle: 'Scaffolder' },
  { name: 'Sarah Koleosho', phone: '+234 805 229 4410', jobTitle: 'Safety officer' },
  undefined, // unassigned helmet — spare in the store
]

/** Never heartbeats — demonstrates presence decaying to 'offline'. */
export const OFFLINE_DEVICE_INDEX = 9
/** Heartbeats rarely — oscillates online → degraded, like a real SIM link. */
export const INTERMITTENT_DEVICE_INDEX = 4
/** Reports almost nothing, to prove the UI tolerates sparse telemetry. */
export const SPARSE_DEVICE_INDEX = 13

const fleet: Device[] = NAMES.map((name, i) => {
  const connectivity: ConnectivityType = i % 3 === 0 ? 'wifi' : 'sim'
  const activeAlarm: AlarmSeverity | null = i === 2 ? 'critical' : i === 7 ? 'warning' : null
  const batteryPercent = i === OFFLINE_DEVICE_INDEX ? 4 : Math.floor(20 + Math.random() * 80)

  return {
    id: `8666520210${String(i).padStart(5, '0')}`,
    name,
    site: SITES[i % SITES.length],
    assignedTo: WEARERS[i % WEARERS.length],
    active: i !== 11, // one helmet deactivated, to exercise the state
    connectivity,
    lastSeenAt:
      i === OFFLINE_DEVICE_INDEX
        ? Date.now() - 2 * 60 * 60 * 1000 // two hours dark
        : Date.now() - Math.floor(Math.random() * 20_000),
    activeAlarm,
    telemetry:
      i === SPARSE_DEVICE_INDEX
        ? { batteryPercent } // a helmet whose firmware exposes almost nothing
        : {
            batteryPercent,
            batteryVoltage: Number((3.5 + (batteryPercent / 100) * 0.7).toFixed(2)),
            lat: 6.5 + Math.random() * 0.05,
            lng: 3.35 + Math.random() * 0.05,
            altitude: Math.floor(10 + Math.random() * 60),
            speed: Number((Math.random() * 1.5).toFixed(1)),
            signalStrength: connectivity === 'sim' ? -Math.floor(65 + Math.random() * 40) : undefined,
            networkType: connectivity === 'sim' ? '4G' : 'Wi-Fi',
            carrier: connectivity === 'sim' ? 'MTN NG' : undefined,
            isWorn: i !== 7,
            isCharging: i === OFFLINE_DEVICE_INDEX,
            isRecording: i === 2,
            // Device 6 is in a confined space with oxygen displaced and CO
            // building — the scenario the thresholds exist for. Device 10 is
            // borderline, to show the warning state as well as danger.
            gas:
              i === 6
                ? [
                    { gas: 'CH4', value: 2.1 },
                    { gas: 'O2', value: 18.6 },
                    { gas: 'CO', value: 142 },
                    { gas: 'H2S', value: 3.4 },
                  ]
                : i === 10
                  ? [
                      { gas: 'CH4', value: 12.4 },
                      { gas: 'O2', value: 20.6 },
                      { gas: 'CO', value: 11 },
                      { gas: 'H2S', value: 0.4 },
                    ]
                  : [
                      { gas: 'CH4', value: Number((Math.random() * 0.4).toFixed(1)) },
                      { gas: 'O2', value: Number((20.6 + Math.random() * 0.4).toFixed(1)) },
                      { gas: 'CO', value: Number((Math.random() * 3).toFixed(1)) },
                      { gas: 'H2S', value: Number((Math.random() * 1.2).toFixed(1)) },
                    ],
          },
  }
})

export function getMockFleet(): Device[] {
  return fleet.map((d) => ({ ...d, telemetry: { ...d.telemetry } }))
}

export function getMockDevice(id: string): Device | undefined {
  const found = fleet.find((d) => d.id === id)
  return found ? { ...found, telemetry: { ...found.telemetry } } : undefined
}

/** Advances the simulated fleet one tick and returns the devices that reported. */
export function tickMockFleet(tick: number): Device[] {
  const reporting: Device[] = []

  fleet.forEach((device, i) => {
    if (i === OFFLINE_DEVICE_INDEX) return
    if (i === INTERMITTENT_DEVICE_INDEX && tick % 12 !== 0) return

    device.lastSeenAt = Date.now()

    if (tick % 20 === 0 && device.telemetry.batteryPercent != null) {
      device.telemetry.batteryPercent = Math.max(0, device.telemetry.batteryPercent - 1)
      if (device.telemetry.batteryVoltage != null) {
        device.telemetry.batteryVoltage = Number(
          (3.5 + (device.telemetry.batteryPercent / 100) * 0.7).toFixed(2)
        )
      }
    }

    reporting.push({ ...device, telemetry: { ...device.telemetry } })
  })

  return reporting
}

// ---------------------------------------------------------------------------
// Simulated telemetry history
// ---------------------------------------------------------------------------

/** Seeded PRNG so a device's history is stable across refetches. */
function mulberry32(seed: number) {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFor(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return Math.abs(hash) || 1
}

/**
 * Battery follows a shift pattern rather than a straight line: drains through
 * the working day, charges overnight. A linear ramp looks obviously synthetic
 * on the 7-day view, and it also hides the sawtooth an operator actually needs
 * to recognise — a helmet that stopped charging.
 */
function batteryAt(ts: number, rand: () => number): number {
  const hour = new Date(ts).getHours() + new Date(ts).getMinutes() / 60
  const inShift = hour >= 7 && hour <= 17
  const raw = inShift
    ? 100 - ((hour - 7) / 10) * 62
    : 38 + (((hour < 7 ? hour + 7 : hour - 17) / 14) * 62)
  return Math.max(0, Math.min(100, raw + (rand() - 0.5) * 4))
}

export function getMockTelemetryWindow(deviceId: string, range: HistoryRange): TelemetryWindow {
  const { durationMs, stepMs } = HISTORY_RANGES[range]
  const rangeEnd = Date.now()
  const rangeStart = rangeEnd - durationMs

  const index = fleet.findIndex((d) => d.id === deviceId)
  const device = fleet[index] ?? fleet[0]
  const rand = mulberry32(seedFor(deviceId))

  // Matches the live fixtures: this helmet has been dark for two hours.
  const goesDarkAt = index === OFFLINE_DEVICE_INDEX ? rangeEnd - 2 * 60 * 60_000 : Infinity

  const samples: TelemetrySample[] = []
  for (let ts = rangeStart; ts <= rangeEnd; ts += stepMs) {
    if (ts > goesDarkAt) break

    // The intermittent helmet drops out in bursts, the way a SIM link does
    // moving between cells or into a basement.
    if (index === INTERMITTENT_DEVICE_INDEX && rand() < 0.14) continue

    const onWifi = device.connectivity === 'wifi' ? rand() > 0.15 : rand() < 0.1
    const connectivity: ConnectivityType = onWifi ? 'wifi' : 'sim'
    const batteryPercent = Math.round(batteryAt(ts, rand))

    samples.push({
      ts,
      batteryPercent,
      batteryVoltage: Number((3.5 + (batteryPercent / 100) * 0.7).toFixed(2)),
      connectivity,
      signalStrength: connectivity === 'sim' ? -Math.round(62 + rand() * 42) : undefined,
      lat: 6.5 + rand() * 0.05,
      lng: 3.35 + rand() * 0.05,
    })
  }

  // Land the right-hand edge on the value the device list is showing, so the
  // chart and the table never disagree about the current battery.
  const current = device.telemetry.batteryPercent
  const last = samples[samples.length - 1]
  if (current != null && last?.batteryPercent != null) {
    const offset = current - last.batteryPercent
    for (const sample of samples) {
      if (sample.batteryPercent == null) continue
      sample.batteryPercent = Math.max(0, Math.min(100, Math.round(sample.batteryPercent + offset)))
    }
  }

  return { range, rangeStart, rangeEnd, stepMs, samples }
}
