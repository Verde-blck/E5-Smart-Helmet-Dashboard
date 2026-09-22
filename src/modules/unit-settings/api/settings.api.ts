import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { DEFAULT_SETTINGS } from '../types'
import type { HelmetSettings } from '../types'

// Per-device settings, held in memory for mock mode.
const mockStore = new Map<string, HelmetSettings>()

/**
 * No endpoint exists for this yet.
 *
 * Both calls below are the contract proposed to the backend:
 *   GET  /api/devices/{deviceId}/settings  → HelmetSettings
 *   PUT  /api/devices/{deviceId}/settings  → HelmetSettings
 *
 * Until those exist, mock mode is the only working path. The live branch is
 * written out in full so switching over is deleting a condition, not writing
 * new code — and so the backend has something concrete to implement against.
 */
export async function fetchHelmetSettings(deviceId: string): Promise<HelmetSettings> {
  if (env.useMocks) {
    return mockStore.get(deviceId) ?? { ...DEFAULT_SETTINGS, alarms: { ...DEFAULT_SETTINGS.alarms } }
  }
  const { data } = await apiClient.get<HelmetSettings>(`/devices/${deviceId}/settings`)
  return data
}

export async function saveHelmetSettings(
  deviceId: string,
  settings: HelmetSettings
): Promise<HelmetSettings> {
  if (env.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 400))
    mockStore.set(deviceId, { ...settings, alarms: { ...settings.alarms } })
    return settings
  }
  const { data } = await apiClient.put<HelmetSettings>(`/devices/${deviceId}/settings`, settings)
  return data
}