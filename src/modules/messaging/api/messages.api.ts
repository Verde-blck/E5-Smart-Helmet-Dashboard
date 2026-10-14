import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { pageContent, ts } from '@/shared/lib/api-normalize'
import type { Page } from '@/shared/lib/api-normalize'
import { getMockMessages, sendMockBroadcast, sendMockMessage } from './messages.mock'
import type { BroadcastDelivery, MessageDirection, SendResult, VoiceMessage } from '../types'

interface ApiMessage {
  id: number
  deviceId: string
  direction?: MessageDirection | null
  audioUrl?: string | null
  createdAt?: string | null
}

function toMessage(api: ApiMessage): VoiceMessage {
  return {
    id: api.id,
    deviceId: api.deviceId,
    direction: api.direction ?? 'TO_HELMET',
    audioUrl: api.audioUrl ?? '',
    createdAt: ts(api.createdAt) ?? 0,
  }
}

export async function fetchMessages(deviceId: string): Promise<VoiceMessage[]> {
  if (env.useMocks) return getMockMessages(deviceId)

  const { data } = await apiClient.get<Page<ApiMessage>>(`/devices/${deviceId}/messages`, {
    params: { page: 0, size: 50 },
  })
  // The API returns newest first; a conversation reads oldest at the top.
  return pageContent(data)
    .map(toMessage)
    .sort((a, b) => a.createdAt - b.createdAt)
}


/** Names the upload by what it actually is: recordings are MP3 now. */
function asFile(file: Blob): File {
  if (file instanceof File) return file
  const mp3 = file.type === 'audio/mpeg' || file.type === 'audio/mp3'
  return new File([file], `message-${Date.now()}.${mp3 ? 'mp3' : 'wav'}`, {
    type: mp3 ? 'audio/mpeg' : file.type || 'audio/wav',
  })
}

/**
 * Walkie-talkie: one clip, played on every chosen helmet. One request rather
 * than one per helmet, and the backend reports each helmet's outcome.
 * Offline helmets get it queued, and it plays when they reconnect.
 *
 * deviceIds is always sent explicitly: leaving it out would send to every
 * active helmet in the fleet, which is never what a selection means.
 */
export async function sendBroadcast(deviceIds: string[], file: Blob): Promise<BroadcastDelivery[]> {
  if (env.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    return sendMockBroadcast(deviceIds, file)
  }
  if (deviceIds.length === 0) return []

  const form = new FormData()
  form.append('file', asFile(file))
  form.append('deviceIds', deviceIds.join(','))

  const { data } = await apiClient.post<{ helmets?: BroadcastDelivery[] }>('/broadcast', form)
  return (data?.helmets ?? []).map((h) => ({
    deviceId: h.deviceId,
    delivered: h.delivered === true,
    messageId: h.messageId,
  }))
}

export async function sendVoiceMessage(deviceId: string, file: Blob): Promise<SendResult> {
  if (env.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return sendMockMessage(deviceId, file)
  }

  const form = new FormData()
  form.append('file', asFile(file))

  const { data } = await apiClient.post<SendResult>(
    `/devices/${deviceId}/messages/audio`,
    form
  )
  return data
}
