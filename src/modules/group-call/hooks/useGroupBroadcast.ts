import { useState } from 'react'
import { sendVoiceMessage } from '@/modules/messaging/api/messages.api'

export interface BroadcastOutcome {
  deviceId: string
  deviceName: string
  ok: boolean
}

/**
 * Sends one recording to several helmets.
 *
 * There is no group-call transport yet — no live push-to-talk — so a group
 * call is delivered as the same voice message the backend already supports,
 * posted once per helmet. Each helmet plays it aloud when it next reports in.
 *
 * Deliberately uses allSettled: one helmet failing must not stop the message
 * reaching the rest, and the operator needs to know precisely which ones
 * missed it.
 */
export function useGroupBroadcast() {
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<BroadcastOutcome[] | null>(null)

  async function broadcast(
    targets: { id: string; name: string }[],
    audio: Blob
  ): Promise<void> {
    setSending(true)
    setResults(null)

    const settled = await Promise.allSettled(
      targets.map((target) => sendVoiceMessage(target.id, audio))
    )

    setResults(
      targets.map((target, i) => ({
        deviceId: target.id,
        deviceName: target.name,
        ok: settled[i].status === 'fulfilled',
      }))
    )
    setSending(false)
  }

  return { broadcast, sending, results, clear: () => setResults(null) }
}
