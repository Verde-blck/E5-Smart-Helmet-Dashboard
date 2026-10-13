import { MOCK_URL_PREFIX } from '../api/live.api'

/*
 * WebRTC with the media server (ZLMediaKit), as in the backend guide.
 *
 * The exchange is one HTTP request: the browser POSTs its SDP offer as plain
 * text and gets back { code, sdp }. code 0 means connected; anything else
 * usually means the helmet hasn't started pushing video yet, which is normal
 * for the first 5 to 10 seconds, so callers retry.
 */

export interface MediaConnection {
  /** Incoming audio and video. Empty for a send-only connection. */
  stream: MediaStream
  close: () => void
  /** Called once if the connection drops after it was established. */
  onLost: (callback: () => void) => void
}

export class NotReadyError extends Error {}

/** Each attempt gives up after this long, so a stalled request can't hang a retry loop. */
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
    const json = (await res.json()) as { code?: number; sdp?: string; msg?: string }
    if (json.code !== 0 || !json.sdp) {
      throw new NotReadyError(json.msg ?? `Media server answered code ${json.code}`)
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
    // 'disconnected' often recovers by itself within seconds; 'failed' won't.
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

/** Receives the helmet's camera and microphone. One attempt; see connectWithRetry. */
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

/** Sends the operator's own camera and microphone, for the helmet to play. */
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

/**
 * Repeats an attempt every couple of seconds until it works, the deadline
 * passes, or the session ends. The guide's timing: the stream is ready 5 to
 * 10 seconds after start, so retry every 2 seconds.
 */
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

// --- Mock mode ----------------------------------------------------------

/**
 * A generated test picture, so the player and controls can be exercised
 * without a helmet. Connects after a short delay, like the real thing.
 */
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
