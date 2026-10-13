import { useState } from 'react'
import { sendBroadcast } from '@/modules/messaging/api/messages.api'

export interface BroadcastOutcome {
  deviceId: string
  deviceName: string
  /** sent: played now · queued: offline, plays on reconnect · failed: not accepted */
  status: 'sent' | 'queued' | 'failed'
}

/**
 * Walkie-talkie: sends one recording to several helmets in a single request
 * (POST /api/broadcast). The backend reports each helmet separately, and the
 * results stay per helmet: a partial outcome has to be visible, not averaged
 * into one success message.
 */
export function useGroupBroadcast() {
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<BroadcastOutcome[] | null>(null)

  async function broadcast(targets: { id: string; name: string }[], audio: Blob): Promise<boolean> {
    setSending(true)
    setResults(null)
    try {
      const deliveries = await sendBroadcast(
        targets.map((t) => t.id),
        audio
      )
      const byId = new Map(deliveries.map((d) => [d.deviceId, d]))
      setResults(
        targets.map((t) => {
          const d = byId.get(t.id)
          return {
            deviceId: t.id,
            deviceName: t.name,
            // Missing from the reply means the backend didn't take it for
            // that helmet (e.g. it's no longer active).
            status: !d ? 'failed' : d.delivered ? 'sent' : 'queued',
          }
        })
      )
      return true
    } catch {
      setResults(targets.map((t) => ({ deviceId: t.id, deviceName: t.name, status: 'failed' })))
      return false
    } finally {
      setSending(false)
    }
  }

  return { broadcast, sending, results, clear: () => setResults(null) }
}
