export type MessageDirection = 'TO_HELMET' | 'FROM_HELMET'

export interface VoiceMessage {
  id: number
  deviceId: string
  direction: MessageDirection
  /** Absolute URL, playable directly in an <audio> element. */
  audioUrl: string
  createdAt: number
}

export interface SendResult {
  messageId: number
  audioUrl: string
  /**
   * False only means the helmet wasn't connected at that instant. The backend
   * queues the message and delivers it on reconnect, so this is "not yet",
   * not "failed" — the UI wording reflects that.
   */
  delivered: boolean
}
