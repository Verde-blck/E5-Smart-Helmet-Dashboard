import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'

export type DeviceCommand =
  | 'take-photo'
  | 'start-recording'
  | 'stop-recording'
  | 'flashlight-on'
  | 'flashlight-off'

export const COMMAND_LABELS: Record<DeviceCommand, string> = {
  'take-photo': 'Take photo',
  'start-recording': 'Start recording',
  'stop-recording': 'Stop recording',
  'flashlight-on': 'Flashlight on',
  'flashlight-off': 'Flashlight off',
}

/**
 * Sends an instruction to a helmet.
 *
 * A command issued while the helmet is briefly offline is queued by the
 * backend and delivered on reconnect, usually within 30–45 seconds — so a
 * success response means "accepted", not "the helmet has done it". The UI
 * says so rather than implying the action has already happened.
 */
export async function sendCommand(deviceId: string, command: DeviceCommand): Promise<void> {
  if (env.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    return
  }

  if (command === 'flashlight-on' || command === 'flashlight-off') {
    const on = command === 'flashlight-on'
    await apiClient.post(`/devices/${deviceId}/commands/flashlight`, null, { params: { on } })
    return
  }

  await apiClient.post(`/devices/${deviceId}/commands/${command}`)
}
