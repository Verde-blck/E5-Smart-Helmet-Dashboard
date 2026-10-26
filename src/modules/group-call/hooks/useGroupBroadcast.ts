import { useState } from 'react'
import { sendBroadcast } from '@/modules/messaging/api/messages.api'

export interface BroadcastOutcome {
  deviceId: string
  deviceName: string
  status: 'sent' | 'queued' | 'failed'
}

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
