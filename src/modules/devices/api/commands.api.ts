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

export async function sendCommand(
  deviceId: string,
  command: DeviceCommand
): Promise<{ delivered?: boolean }> {
  if (env.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    return { delivered: true }
  }

  const { data } =
    command === 'flashlight-on' || command === 'flashlight-off'
      ? await apiClient.post<{ delivered?: boolean } | null>(
          `/devices/${deviceId}/commands/flashlight`,
          null,
          { params: { on: command === 'flashlight-on' } }
        )
      : await apiClient.post<{ delivered?: boolean } | null>(
          `/devices/${deviceId}/commands/${command}`
        )

  return { delivered: typeof data?.delivered === 'boolean' ? data.delivered : undefined }
}
