export type MessageDirection = 'TO_HELMET' | 'FROM_HELMET'

export interface VoiceMessage {
  id: number
  deviceId: string
  direction: MessageDirection
  audioUrl: string
  createdAt: number
}

export interface SendResult {
  messageId: number
  audioUrl: string
  delivered: boolean
}

/** One helmet's copy of a broadcast. */
export interface BroadcastDelivery {
  deviceId: string
  /** false: offline. Queued, and plays when the helmet reconnects. */
  delivered: boolean
  messageId?: number
}
