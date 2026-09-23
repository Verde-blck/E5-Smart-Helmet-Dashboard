import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { pageContent, ts } from '@/shared/lib/api-normalize'
import type { Page } from '@/shared/lib/api-normalize'
import { getMockMessages, sendMockMessage } from './messages.mock'
import type { MessageDirection, SendResult, VoiceMessage } from '../types'

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

/**
 * Uploads an audio file for the helmet to play aloud.
 *
 * Multipart rather than JSON, and Content-Type is deliberately not set —
 * the browser has to add its own multipart boundary, and setting the header
 * manually breaks the request.
 */
export async function sendVoiceMessage(deviceId: string, file: Blob): Promise<SendResult> {
  if (env.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return sendMockMessage(deviceId, file)
  }

  const form = new FormData()
  const named =
    file instanceof File ? file : new File([file], `message-${Date.now()}.wav`, { type: 'audio/wav' })
  form.append('file', named)

  const { data } = await apiClient.post<SendResult>(
    `/devices/${deviceId}/messages/audio`,
    form
  )
  return data
}
