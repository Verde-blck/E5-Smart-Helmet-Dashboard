import { startCall, startLive, stopCall } from '../api/live.api'
import type { SessionMode } from '../api/live.api'
import { NotReadyError, connectWithRetry, play, push } from './webrtc'
import type { MediaConnection } from './webrtc'
import { getLocalMedia } from './localMedia'

export type SessionStatus =
  | 'requesting-media'
  | 'starting'
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'offline'
  | 'failed'
  | 'ended'

export interface SessionState {
  status: SessionStatus
  error: string | null
  remoteStream: MediaStream | null
  localStream: MediaStream | null
  micOn: boolean
  cameraOn: boolean
  noCamera: boolean
  outgoingFailed: boolean
  // The media server's own reason for refusing our push, for diagnosis.
  outgoingError?: string
  liveSince: number | null
}

const INITIAL: SessionState = {
  status: 'starting',
  error: null,
  remoteStream: null,
  localStream: null,
  micOn: true,
  cameraOn: true,
  noCamera: false,
  outgoingFailed: false,
  liveSince: null,
}

// A plain object, not React state: its lifetime is the session's, not a component's.
export class HelmetSession {
  private state: SessionState
  private readonly listeners = new Set<() => void>()
  private readonly controller = new AbortController()
  private remote: MediaConnection | null = null
  private outgoing: MediaConnection | null = null
  private startSent = false
  private watchUrl = ''

  constructor(
    readonly deviceId: string,
    readonly mode: SessionMode,
    private readonly withCamera = true
  ) {
    this.state = {
      ...INITIAL,
      status: mode === 'call' ? 'requesting-media' : 'starting',
      cameraOn: mode === 'call' && withCamera,
    }
    if (mode === 'call') window.addEventListener('pagehide', this.onPageHide)
  }

  getState = (): SessionState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private set(patch: Partial<SessionState>) {
    if (this.state.status === 'ended') return
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
  }

  private get signal() {
    return this.controller.signal
  }

  async start(): Promise<void> {
    try {
      let local: MediaStream | null = null
      if (this.mode === 'call') {
        local = await this.getLocalMedia()
        if (this.signal.aborted) return
        this.set({ localStream: local, status: 'starting' })
      }

      this.startSent = true
      const call = this.mode === 'call' ? await startCall(this.deviceId) : null
      const started = call ?? (await startLive(this.deviceId))

      if (this.signal.aborted) {
        if (this.mode === 'call') void stopCall(this.deviceId)
        return
      }
      if (!started.delivered) {
        this.set({ status: 'offline' })
        return
      }
      if (!started.watchUrl) throw new Error('The backend returned no stream address.')
      this.watchUrl = started.watchUrl

      if (call && local) {
        if (!call.adminPushUrl) throw new Error('The backend returned no address to send your audio to.')
        void this.connectOutgoing(call.adminPushUrl, local)
      }
      await this.connectRemote()
    } catch (error) {
      if (this.signal.aborted) return
      this.set({ status: 'failed', error: describe(error) })
    }
  }

  retry(): void {
    if (this.state.status !== 'failed' || !this.watchUrl) return
    this.set({ error: null })
    void this.connectRemote().catch((error) => {
      if (!this.signal.aborted) this.set({ status: 'failed', error: describe(error) })
    })
  }

  end({ unloading = false }: { unloading?: boolean } = {}): void {
    if (this.state.status === 'ended') return
    this.controller.abort()
    window.removeEventListener('pagehide', this.onPageHide)

    this.remote?.close()
    this.outgoing?.close()
    // Stopping the tracks turns the camera light off.
    this.state.localStream?.getTracks().forEach((t) => t.stop())

    if (this.mode === 'call' && this.startSent) void stopCall(this.deviceId, { unloading })

    this.state = { ...this.state, status: 'ended', remoteStream: null, localStream: null }
    this.listeners.forEach((l) => l())
  }

  private onPageHide = () => this.end({ unloading: true })

  private async connectRemote(): Promise<void> {
    const reconnecting = this.state.liveSince !== null
    this.set({ status: reconnecting ? 'reconnecting' : 'connecting' })

    const connection = await connectWithRetry(() => play(this.watchUrl, this.signal), this.signal)
    if (this.signal.aborted) {
      connection.close()
      return
    }

    this.remote = connection
    this.set({
      status: 'live',
      remoteStream: connection.stream,
      liveSince: this.state.liveSince ?? Date.now(),
    })

    connection.onLost(() => {
      connection.close()
      if (this.remote === connection) this.remote = null
      if (this.signal.aborted) return
      void this.connectRemote().catch((error) => {
        if (!this.signal.aborted) {
          this.set({
            status: 'failed',
            error:
              error instanceof NotReadyError
                ? 'The picture was lost and didn’t come back. The helmet may have a weak signal.'
                : describe(error),
          })
        }
      })
    })
  }

  private async connectOutgoing(pushUrl: string, local: MediaStream): Promise<void> {
    try {
      this.outgoing = await connectWithRetry(() => push(pushUrl, local, this.signal), this.signal, {
        deadlineMs: 20_000,
      })
      if (this.signal.aborted) this.outgoing.close()
    } catch (error) {
      if (this.signal.aborted) return
      const reason = error instanceof Error ? error.message : String(error)
      console.warn(`[call] push to ${pushUrl} refused:`, reason)
      this.set({ outgoingFailed: true, outgoingError: reason })
    }
  }

  toggleMic(): void {
    const next = !this.state.micOn
    this.state.localStream?.getAudioTracks().forEach((t) => (t.enabled = next))
    this.set({ micOn: next })
  }

  // Disabling sends black frames instead of renegotiating, so it's instant both ways.
  toggleCamera(): void {
    if (this.state.noCamera || !this.withCamera) return
    const next = !this.state.cameraOn
    this.state.localStream?.getVideoTracks().forEach((t) => (t.enabled = next))
    this.set({ cameraOn: next })
  }

  private async getLocalMedia(): Promise<MediaStream> {
    const { stream, noCamera } = await getLocalMedia(this.withCamera)
    if (noCamera) this.set({ noCamera: true, cameraOn: false })
    return stream
  }
}

export function describe(error: unknown): string {
  const name = (error as { name?: string })?.name
  if (name === 'NotAllowedError') {
    return 'The browser was refused access to the microphone or camera. Allow it from the icon in the address bar, then try again.'
  }
  if (name === 'NotFoundError') return 'No microphone was found on this computer.'
  if (name === 'NotReadableError') {
    return 'The microphone or camera is being used by another app. Close it and try again.'
  }
  if (error instanceof NotReadyError) {
    return 'The helmet didn’t start sending video within 30 seconds. It may have a weak signal.'
  }
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 401 || status === 403) return 'Your session has expired. Sign in again.'
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong connecting to the helmet.'
}