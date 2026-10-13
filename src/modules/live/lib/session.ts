import { startCall, startLive, stopCall } from '../api/live.api'
import type { SessionMode } from '../api/live.api'
import { NotReadyError, connectWithRetry, play, push } from './webrtc'
import type { MediaConnection } from './webrtc'
import { getLocalMedia } from './localMedia'

export type SessionStatus =
  | 'requesting-media' // call only: waiting for camera/mic permission
  | 'starting' // asking the backend to start the helmet
  | 'connecting' // helmet told; waiting for its first picture (5–10 s)
  | 'live'
  | 'reconnecting' // picture dropped; trying to get it back
  | 'offline' // helmet didn't receive the start command
  | 'failed'
  | 'ended'

export interface SessionState {
  status: SessionStatus
  error: string | null
  remoteStream: MediaStream | null
  /** Call only: the operator's own camera, for the self-view. */
  localStream: MediaStream | null
  micOn: boolean
  cameraOn: boolean
  /** Call only: the camera was wanted but none was found, so it's voice. */
  noCamera: boolean
  /** Call only: our audio/video couldn't reach the helmet. */
  outgoingFailed: boolean
  /** When the picture first arrived, for the call timer. */
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

/**
 * One live view or one call with one helmet, from start to hang-up.
 *
 * A plain object rather than React state, because its lifetime is the
 * session's, not a component's.
 *
 * Ending works differently for the two modes, as the backend specifies:
 * - Live view: end() only closes this browser's connection. Others may be
 *   watching the same helmet, and the media server stops the helmet itself
 *   about 20 seconds after the last viewer leaves.
 * - Call: end() also takes the helmet out of call mode, on every way out,
 *   including the tab closing mid-call.
 */
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
    /** Call only: false for a voice call. */
    private readonly withCamera = true
  ) {
    this.state = {
      ...INITIAL,
      status: mode === 'call' ? 'requesting-media' : 'starting',
      cameraOn: mode === 'call' && withCamera,
    }
    // A closing tab drops the connection by itself; only a call has
    // something to tell the backend.
    if (mode === 'call') window.addEventListener('pagehide', this.onPageHide)
  }

  // --- For useSyncExternalStore -----------------------------------------

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

  // --- Lifecycle --------------------------------------------------------

  async start(): Promise<void> {
    try {
      let local: MediaStream | null = null
      if (this.mode === 'call') {
        // Ask for the camera and mic before touching the helmet: if the
        // operator refuses, the helmet never gets put into call mode.
        local = await this.getLocalMedia()
        if (this.signal.aborted) return
        this.set({ localStream: local, status: 'starting' })
      }

      // Marked before the request goes out, so a call ended mid-request
      // still takes the helmet out of call mode.
      this.startSent = true
      const call = this.mode === 'call' ? await startCall(this.deviceId) : null
      const started = call ?? (await startLive(this.deviceId))

      if (this.signal.aborted) {
        // Hung up while the start request was in flight; make sure the stop
        // lands after the start.
        if (this.mode === 'call') void stopCall(this.deviceId)
        return
      }
      if (!started.delivered) {
        // Offline. Live view and call commands aren't queued, so nothing
        // will happen later; the operator can try again once it's online.
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

  /** After a failed connection: try to get the picture again without re-sending start. */
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
    // Turns the camera light off; leaving tracks running keeps the camera on.
    this.state.localStream?.getTracks().forEach((t) => t.stop())

    // Live view sends nothing: see the class comment.
    if (this.mode === 'call' && this.startSent) void stopCall(this.deviceId, { unloading })

    this.state = { ...this.state, status: 'ended', remoteStream: null, localStream: null }
    this.listeners.forEach((l) => l())
  }

  private onPageHide = () => this.end({ unloading: true })

  // --- Connections ------------------------------------------------------

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
    } catch {
      if (!this.signal.aborted) this.set({ outgoingFailed: true })
    }
  }

  // --- Call controls ----------------------------------------------------

  toggleMic(): void {
    const next = !this.state.micOn
    this.state.localStream?.getAudioTracks().forEach((t) => (t.enabled = next))
    this.set({ micOn: next })
  }

  /** Off sends black frames rather than renegotiating, so it's instant both ways. */
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

/** A sentence an operator can act on, for anything that can go wrong. */
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
