import { env } from '@/config/env'
import { useConnectionStore } from '@/shared/store/connectionStore'

interface Handlers {
  onMessage: (data: unknown) => void
  onReconnect: () => void
}

const MAX_BACKOFF_MS = 30_000

// `wanted` stops close() from triggering onclose's reconnect.
class WebSocketClient {
  private socket: WebSocket | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private attempts = 0
  private wanted = false
  private everConnected = false
  private handlers: Handlers | null = null

  connect(handlers: Handlers) {
    if (env.useMocks) return
    this.handlers = handlers
    this.wanted = true
    useConnectionStore.getState().set('connecting')
    this.open()
  }

  disconnect() {
    this.wanted = false
    this.everConnected = false
    this.attempts = 0

    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    const socket = this.socket
    this.socket = null
    if (socket) {
      socket.onopen = null
      socket.onmessage = null
      socket.onerror = null
      socket.onclose = null
      socket.close()
    }

    useConnectionStore.getState().set('offline')
  }

  get isConnected() {
    return this.socket?.readyState === WebSocket.OPEN
  }

  private open() {
    if (!this.wanted) return
    const state = this.socket?.readyState
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return

    const socket = new WebSocket(env.wsUrl)
    this.socket = socket

    socket.onopen = () => {
      this.attempts = 0
      useConnectionStore.getState().set('live')
      if (this.everConnected) this.handlers?.onReconnect()
      this.everConnected = true
    }

    socket.onmessage = (event) => {
      try {
        this.handlers?.onMessage(JSON.parse(event.data))
      } catch {
        // Malformed frame — ignore rather than tearing down the connection.
      }
    }

    socket.onerror = () => socket.close()

    socket.onclose = () => {
      if (this.socket === socket) this.socket = null
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (!this.wanted || this.timer) return

    // Exponential backoff with jitter, so a down backend isn't hammered and clients don't retry in
    // lockstep.
    const delay = Math.min(MAX_BACKOFF_MS, 1_000 * 2 ** this.attempts) + Math.random() * 500
    this.attempts += 1
    useConnectionStore.getState().set('reconnecting')

    this.timer = setTimeout(() => {
      this.timer = null
      this.open()
    }, delay)
  }
}

export const wsClient = new WebSocketClient()
