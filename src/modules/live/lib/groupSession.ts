import {
  activeGroupCall,
  getGroupCall,
  startGroupCall,
  stopGroupCall,
} from '../api/groupCall.api'
import type { GroupCall } from '../api/groupCall.api'
import { describe } from './session'
import { getLocalMedia } from './localMedia'
import { connectWithRetry, play, push } from './webrtc'
import type { MediaConnection } from './webrtc'

export type ParticipantStatus = 'connecting' | 'live' | 'reconnecting' | 'unreachable' | 'failed'

export interface Participant {
  deviceId: string
  status: ParticipantStatus
  stream: MediaStream | null
}

export interface GroupCallState {
  status: 'requesting-media' | 'starting' | 'active' | 'failed' | 'ended'
  error: string | null
  callId: string | null
  participants: Participant[]
  localStream: MediaStream | null
  micOn: boolean
  cameraOn: boolean
  noCamera: boolean
  outgoingFailed: boolean
  startedAt: number | null
}

export class GroupCallSession {
  private state: GroupCallState
  private readonly listeners = new Set<() => void>()
  private readonly controller = new AbortController()
  private readonly incoming = new Map<string, MediaConnection>()
  private outgoing: MediaConnection | null = null
  private call: GroupCall | null = null
  private startSent = false

  constructor(private readonly withCamera: boolean) {
    this.state = {
      status: 'requesting-media',
      error: null,
      callId: null,
      participants: [],
      localStream: null,
      micOn: true,
      cameraOn: withCamera,
      noCamera: false,
      outgoingFailed: false,
      startedAt: null,
    }
    window.addEventListener('pagehide', this.onPageHide)
  }

  getState = (): GroupCallState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private set(patch: Partial<GroupCallState>) {
    if (this.state.status === 'ended') return
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
  }

  private setParticipant(deviceId: string, patch: Partial<Participant>) {
    this.set({
      participants: this.state.participants.map((p) =>
        p.deviceId === deviceId ? { ...p, ...patch } : p
      ),
    })
  }

  private get signal() {
    return this.controller.signal
  }

  async start(deviceIds: string[]): Promise<void> {
    await this.run(async () => {
      this.startSent = true
      return startGroupCall(deviceIds)
    })
  }

  async rejoin(callId: string): Promise<void> {
    await this.run(async () => {
      const call = await getGroupCall(callId)
      if (!call) {
        activeGroupCall.set(null)
        throw new Error('That call has already ended.')
      }
      this.startSent = true
      return call
    })
  }

  private async run(open: () => Promise<GroupCall>): Promise<void> {
    try {
      const { stream, noCamera } = await getLocalMedia(this.withCamera)
      if (this.signal.aborted) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      this.set({
        localStream: stream,
        status: 'starting',
        ...(noCamera ? { noCamera: true, cameraOn: false } : {}),
      })

      const call = await open()
      this.call = call
      activeGroupCall.set(call.callId)
      if (this.signal.aborted) {
        void stopGroupCall(call.callId)
        activeGroupCall.set(null)
        return
      }

      this.set({
        status: 'active',
        callId: call.callId,
        startedAt: Date.now(),
        participants: call.helmets.map((h) => ({
          deviceId: h.deviceId,
          status: h.delivered && h.watchUrl ? 'connecting' : 'unreachable',
          stream: null,
        })),
      })

      if (call.adminPushUrl) void this.connectOutgoing(call.adminPushUrl, stream)
      else this.set({ outgoingFailed: true })

      for (const helmet of call.helmets) {
        if (helmet.delivered && helmet.watchUrl) void this.connectHelmet(helmet.deviceId)
      }
    } catch (error) {
      if (!this.signal.aborted) this.set({ status: 'failed', error: describe(error) })
    }
  }

  retryHelmet(deviceId: string): void {
    const p = this.state.participants.find((x) => x.deviceId === deviceId)
    if (p?.status === 'failed') void this.connectHelmet(deviceId)
  }

  private async connectHelmet(deviceId: string): Promise<void> {
    const helmet = this.call?.helmets.find((h) => h.deviceId === deviceId)
    if (!helmet) return
    const before = this.state.participants.find((p) => p.deviceId === deviceId)
    this.setParticipant(deviceId, {
      status: before?.status === 'live' || before?.status === 'reconnecting' ? 'reconnecting' : 'connecting',
    })

    try {
      const connection = await connectWithRetry(() => play(helmet.watchUrl, this.signal), this.signal)
      if (this.signal.aborted) {
        connection.close()
        return
      }
      this.incoming.set(deviceId, connection)
      this.setParticipant(deviceId, { status: 'live', stream: connection.stream })
      connection.onLost(() => {
        connection.close()
        if (this.incoming.get(deviceId) === connection) this.incoming.delete(deviceId)
        if (!this.signal.aborted) {
          this.setParticipant(deviceId, { status: 'reconnecting' })
          void this.connectHelmet(deviceId)
        }
      })
    } catch {
      if (!this.signal.aborted) this.setParticipant(deviceId, { status: 'failed', stream: null })
    }
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

  toggleMic(): void {
    const next = !this.state.micOn
    this.state.localStream?.getAudioTracks().forEach((t) => (t.enabled = next))
    this.set({ micOn: next })
  }

  toggleCamera(): void {
    if (this.state.noCamera || !this.withCamera) return
    const next = !this.state.cameraOn
    this.state.localStream?.getVideoTracks().forEach((t) => (t.enabled = next))
    this.set({ cameraOn: next })
  }

  end({ unloading = false }: { unloading?: boolean } = {}): void {
    if (this.state.status === 'ended') return
    this.controller.abort()
    window.removeEventListener('pagehide', this.onPageHide)

    this.incoming.forEach((c) => c.close())
    this.incoming.clear()
    this.outgoing?.close()
    this.state.localStream?.getTracks().forEach((t) => t.stop())

    if (this.startSent && this.call) {
      void stopGroupCall(this.call.callId, { unloading })
      if (!unloading) activeGroupCall.set(null)
    }

    this.state = { ...this.state, status: 'ended', localStream: null }
    this.listeners.forEach((l) => l())
  }

  private onPageHide = () => this.end({ unloading: true })
}
