import { toneWav } from '../lib/wav'
import type { SendResult, VoiceMessage } from '../types'

// Real audio, so playback genuinely works in mock mode rather than showing a
// dead player. Built once and reused — the blob URL lives for the session.
let toneUrl: string | null = null
function mockAudioUrl(): string {
  if (!toneUrl) toneUrl = URL.createObjectURL(toneWav())
  return toneUrl
}

const MINUTE = 60_000
let nextId = 100
const store = new Map<string, VoiceMessage[]>()

function seed(deviceId: string): VoiceMessage[] {
  const now = Date.now()
  return [
    {
      id: 1,
      deviceId,
      direction: 'TO_HELMET',
      audioUrl: mockAudioUrl(),
      createdAt: now - 95 * MINUTE,
    },
    {
      id: 2,
      deviceId,
      direction: 'FROM_HELMET',
      audioUrl: mockAudioUrl(),
      createdAt: now - 88 * MINUTE,
    },
    {
      id: 3,
      deviceId,
      direction: 'TO_HELMET',
      audioUrl: mockAudioUrl(),
      createdAt: now - 22 * MINUTE,
    },
  ]
}

export function getMockMessages(deviceId: string): VoiceMessage[] {
  if (!store.has(deviceId)) store.set(deviceId, seed(deviceId))
  return [...(store.get(deviceId) ?? [])].sort((a, b) => a.createdAt - b.createdAt)
}

export function sendMockMessage(deviceId: string, file: Blob): SendResult {
  const message: VoiceMessage = {
    id: nextId++,
    deviceId,
    direction: 'TO_HELMET',
    audioUrl: URL.createObjectURL(file),
    createdAt: Date.now(),
  }
  store.set(deviceId, [...(store.get(deviceId) ?? seed(deviceId)), message])
  return { messageId: message.id, audioUrl: message.audioUrl, delivered: false }
}
