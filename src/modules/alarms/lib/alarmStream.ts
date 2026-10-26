import { env } from '@/config/env'
import { apiClient } from '@/shared/lib/api-client'
import { tokenStore } from '@/shared/lib/token'
import { toAlarm } from '../api/alarms.api'
import type { ApiAlarm } from '../api/alarms.api'
import type { Alarm } from '../types'

// Read with fetch, not EventSource: EventSource can't send the Authorization header. The server
// closes the stream every 30 minutes; Last-Event-ID replays what was missed.

export interface StreamHandlers {
  onAlarm: (alarm: Alarm) => void
  onUpdate: (alarm: Alarm) => void
  onStatus: (connected: boolean) => void
  onReconnected: () => void
}

export function parseBlock(block: string): { event: string; data: string; id?: string } {
  let event = 'message'
  let id: string | undefined
  const data: string[] = []
  for (const line of block.split('\n')) {
    if (line.startsWith(':')) continue
    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    let value = colon === -1 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'event') event = value
    else if (field === 'data') data.push(value)
    else if (field === 'id') id = value
  }
  return { event, data: data.join('\n'), id }
}

export async function runAlarmStream(handlers: StreamHandlers, signal: AbortSignal): Promise<void> {
  if (env.useMocks) return

  let lastId: string | undefined
  let backoff = 1000
  let connectedBefore = false

  while (!signal.aborted) {
    const token = tokenStore.get()
    if (!token) return
    try {
      const base = (apiClient.defaults.baseURL ?? '/api').replace(/\/$/, '')
      const res = await fetch(`${base}/alarms/stream`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
          ...(lastId ? { 'Last-Event-ID': lastId } : {}),
        },
        signal,
      })
      // Signed out or token expired: the regular API calls handle that.
      if (res.status === 401 || res.status === 403) return
      if (!res.ok || !res.body) throw new Error(`Stream answered ${res.status}`)

      handlers.onStatus(true)
      if (connectedBefore) handlers.onReconnected()
      connectedBefore = true
      backoff = 1000

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += value.replace(/\r\n/g, '\n')
        let end: number
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, end)
          buffer = buffer.slice(end + 2)
          const { event, data, id } = parseBlock(block)
          if (!data) continue
          let raw: ApiAlarm
          try {
            raw = JSON.parse(data) as ApiAlarm
          } catch {
            continue
          }
          if (event === 'alarm') {
            lastId = id ?? String(raw.id)
            handlers.onAlarm(toAlarm(raw))
          } else if (event === 'alarm-update') {
            handlers.onUpdate(toAlarm(raw))
          }
        }
      }
    } catch {
      if (signal.aborted) return
    }
    handlers.onStatus(false)
    await new Promise((resolve) => setTimeout(resolve, backoff))
    backoff = Math.min(backoff * 2, 30_000)
  }
}

let connected = false
const listeners = new Set<() => void>()

export const streamStatus = {
  get: () => connected,
  set(next: boolean) {
    if (next === connected) return
    connected = next
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
