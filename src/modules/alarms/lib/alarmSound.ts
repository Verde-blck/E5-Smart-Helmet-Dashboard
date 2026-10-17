/*
 * Alarm sounds for this tab: a ringtone that repeats while any critical alarm
 * is unacknowledged, and a single chime for everything else. Generated with
 * Web Audio, so there are no files to load.
 *
 * Browsers only allow sound after the user has interacted with the page, so
 * the audio is unlocked by the first click or key press, and the UI shows an
 * "Enable alarm sound" prompt until then.
 */

type Listener = () => void

let ctx: AudioContext | null = null
const ringing = new Set<string>()
const listeners = new Set<Listener>()
let loop: ReturnType<typeof setInterval> | null = null
/** Same array until something changes, as React's store subscription needs. */
let snapshot: string[] = []

function notify() {
  snapshot = [...ringing]
  listeners.forEach((l) => l())
}

function context(): AudioContext | null {
  if (ctx) return ctx
  const Ctx =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  ctx = new Ctx()
  ctx.addEventListener('statechange', notify)
  return ctx
}

/** Call once at start-up: the first interaction anywhere unlocks sound. */
export function installSoundUnlock(): () => void {
  const unlock = () => {
    const c = context()
    if (c && c.state !== 'running') void c.resume().then(notify)
  }
  window.addEventListener('pointerdown', unlock, true)
  window.addEventListener('keydown', unlock, true)
  return () => {
    window.removeEventListener('pointerdown', unlock, true)
    window.removeEventListener('keydown', unlock, true)
  }
}

/** True once the browser lets this tab play sound. */
export function soundEnabled(): boolean {
  return ctx?.state === 'running'
}

export async function enableSound(): Promise<void> {
  const c = context()
  if (c && c.state !== 'running') await c.resume()
  notify()
  chime() // confirms it works
}

function tone(c: AudioContext, freq: number, start: number, length: number, volume: number) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  const t = c.currentTime + start
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + length + 0.02)
}

/** One short two-note chime: a new alarm that isn't critical. */
export function chime(): void {
  const c = context()
  if (!c || c.state !== 'running') return
  tone(c, 660, 0, 0.18, 0.18)
  tone(c, 880, 0.2, 0.25, 0.18)
}

/** One burst of the ringtone: four quick alternating notes. */
function ringOnce() {
  const c = context()
  if (!c || c.state !== 'running') return
  ;[0, 0.22, 0.44, 0.66].forEach((at, i) => tone(c, i % 2 ? 660 : 988, at, 0.18, 0.3))
}

/** Starts ringing for this alarm (until it's acknowledged or resolved). */
export function ring(alarmId: string): void {
  if (ringing.has(alarmId)) return
  ringing.add(alarmId)
  if (!loop) {
    ringOnce()
    loop = setInterval(() => {
      if (ringing.size === 0) return
      ringOnce()
    }, 2200)
  }
  notify()
}

/** Stops ringing for one alarm. */
export function acknowledge(alarmId: string): void {
  if (!ringing.delete(alarmId)) return
  if (ringing.size === 0 && loop) {
    clearInterval(loop)
    loop = null
  }
  notify()
}

export function acknowledgeAll(): void {
  ;[...ringing].forEach(acknowledge)
}

export function ringingIds(): string[] {
  return snapshot
}

export function subscribeSound(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
