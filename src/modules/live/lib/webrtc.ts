import { MOCK_URL_PREFIX } from '../api/live.api'

// ZLMediaKit: POST the SDP offer as text, get back { code, sdp }. A non-zero code usually means the
// helmet isn't pushing yet.

export interface MediaConnection {
  stream: MediaStream
  close: () => void
  onLost: (callback: () => void) => void
}

export class NotReadyError extends Error {}

// Bounded so a stalled request can't hang the retry loop.
const ATTEMPT_TIMEOUT_MS = 8_000

async function exchange(url: string, pc: RTCPeerConnection, signal: AbortSignal): Promise<void> {
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), ATTEMPT_TIMEOUT_MS)
  const abort = () => timeout.abort()
  signal.addEventListener('abort', abort)

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: offer.sdp,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      signal: timeout.signal,
    })
    if (!res.ok) throw new NotReadyError(`Media server answered HTTP ${res.status}`)
    const json = (await res.json()) as { code?: number; sdp?: string; msg?: string }
    if (json.code !== 0 || !json.sdp) {
      throw new NotReadyError(`code ${json.code}${json.msg ? `: ${json.msg}` : ''}`)
    }
    await pc.setRemoteDescription({ type: 'answer', sdp: json.sdp })
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }
}

function wrap(pc: RTCPeerConnection, stream: MediaStream): MediaConnection {
  let lost: (() => void) | null = null
  let fired = false
  pc.addEventListener('connectionstatechange', () => {
    if (pc.connectionState === 'failed' && !fired) {
      fired = true
      lost?.()
    }
  })
  return {
    stream,
    close: () => pc.close(),
    onLost: (callback) => {
      lost = callback
    },
  }
}

export async function play(watchUrl: string, signal: AbortSignal): Promise<MediaConnection> {
  if (watchUrl.startsWith(MOCK_URL_PREFIX)) return mockPlay(signal)

  const pc = new RTCPeerConnection()
  try {
    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.addTransceiver('audio', { direction: 'recvonly' })
    const stream = new MediaStream()
    pc.addEventListener('track', (e) => stream.addTrack(e.track))
    await exchange(watchUrl, pc, signal)
    return wrap(pc, stream)
  } catch (error) {
    pc.close()
    throw error
  }
}

export async function push(
  pushUrl: string,
  media: MediaStream,
  signal: AbortSignal
): Promise<MediaConnection> {
  if (pushUrl.startsWith(MOCK_URL_PREFIX)) {
    return { stream: new MediaStream(), close: () => {}, onLost: () => {} }
  }

  const pc = new RTCPeerConnection()
  try {
    media.getTracks().forEach((track) => pc.addTransceiver(track, { direction: 'sendonly' }))
    await exchange(pushUrl, pc, signal)
    return wrap(pc, new MediaStream())
  } catch (error) {
    pc.close()
    throw error
  }
}

// The stream is ready 5 to 10 s after start, so retry every 2 s.
export async function connectWithRetry(
  attempt: () => Promise<MediaConnection>,
  signal: AbortSignal,
  { intervalMs = 2_000, deadlineMs = 30_000 } = {}
): Promise<MediaConnection> {
  const giveUpAt = Date.now() + deadlineMs
  let lastError: unknown = null

  while (!signal.aborted && Date.now() < giveUpAt) {
    try {
      return await attempt()
    } catch (error) {
      lastError = error
      if (signal.aborted) break
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }
  if (signal.aborted) throw new DOMException('Session ended', 'AbortError')
  throw lastError ?? new Error('Could not connect')
}

async function mockPlay(signal: AbortSignal): Promise<MediaConnection> {
  await new Promise((resolve) => setTimeout(resolve, 1_500))
  if (signal.aborted) throw new DOMException('Session ended', 'AbortError')

  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 360
  const ctx = canvas.getContext('2d')
  let frame = 0
  const timer = setInterval(() => {
    if (!ctx) return
    frame++
    ctx.fillStyle = '#0C352F'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = 'rgba(163,226,215,0.25)'
    for (let x = (frame * 2) % 40; x < canvas.width; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    ctx.fillStyle = '#A3E2D7'
    ctx.font = '600 22px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Mock helmet camera', canvas.width / 2, canvas.height / 2 - 6)
    ctx.font = '14px monospace'
    ctx.fillText(new Date().toLocaleTimeString(), canvas.width / 2, canvas.height / 2 + 22)
  }, 100)

  const stream = canvas.captureStream(10)
  return {
    stream,
    close: () => {
      clearInterval(timer)
      stream.getTracks().forEach((t) => t.stop())
    },
    onLost: () => {},
  }
}