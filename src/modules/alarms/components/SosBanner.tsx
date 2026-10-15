import { useEffect, useRef } from 'react'
import { useDeviceNames } from '@/modules/devices/hooks/useDevices'
import { Link, useLocation } from 'react-router-dom'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { SosCallButton } from '@/modules/live/components/SosCallButton'
import { useAlarms } from '../hooks/useAlarms'

/** An SOS raised longer ago than this, already showing when the page loads, doesn't beep. */
const FRESH_MS = 2 * 60_000

/**
 * The app-wide SOS strip, on every page under the top bar, so an operator on
 * Track Playback or Video Record still sees an emergency and can join it
 * without navigating. Alarm Record has its own fuller SOS panel, so the strip
 * steps aside there.
 *
 * Also beeps once when a new SOS arrives, and puts "SOS" in the tab title so
 * it shows when the dashboard is behind another window.
 */
export function SosBanner() {
  const { active: rawActive, now } = useAlarms()
  const nameOf = useDeviceNames()
  const active = rawActive.map((a) => ({ ...a, deviceName: nameOf(a.deviceId, a.deviceName) }))
  const { pathname } = useLocation()
  const sos = active.filter((a) => a.type === 'sos').sort((a, b) => b.raisedAt - a.raisedAt)

  useSosTone(sos.map((a) => ({ id: a.id, raisedAt: a.raisedAt })))
  useSosTitle(sos.length)

  if (sos.length === 0 || pathname.startsWith('/alarms')) return null

  const latest = sos[0]
  const more = sos.length - 1

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-red-300 bg-red-50 px-4 py-2.5 sm:px-6"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
      </span>
      <p className="min-w-0 flex-1 text-sm text-red-900">
        <span className="font-semibold">SOS from {latest.deviceName}</span>
        <span className="text-red-800"> · {formatLastSeen(latest.raisedAt, now)}</span>
        {more > 0 && (
          <>
            {' '}
            <Link to="/alarms" className="font-medium underline underline-offset-2">
              and {more} more
            </Link>
          </>
        )}
      </p>
      <SosCallButton deviceId={latest.deviceId} deviceName={latest.deviceName} />
      <Link to="/alarms" className="text-xs font-medium text-red-800 hover:text-red-950">
        View alarms
      </Link>
    </div>
  )
}

/**
 * Two short beeps for each new SOS. Generated rather than an audio file, so
 * there's nothing to load. Browsers allow sound once the user has interacted
 * with the page, which signing in already counts as; if a browser still
 * blocks it, it fails silently and the banner does the job.
 */
function useSosTone(alarms: { id: string; raisedAt: number }[]) {
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    const ids = new Set(alarms.map((a) => a.id))
    if (seen.current === null) {
      // First render: only beep for alarms that are genuinely new, not an old
      // SOS that was already sitting there when the page opened.
      seen.current = ids
      if (alarms.some((a) => Date.now() - a.raisedAt < FRESH_MS)) beep()
      return
    }
    const fresh = alarms.some((a) => !seen.current!.has(a.id))
    seen.current = ids
    if (fresh) beep()
  }, [alarms.map((a) => a.id).join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
}

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const tone = (start: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + 0.25)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + 0.26)
    }
    tone(0)
    tone(0.35)
    setTimeout(() => void ctx.close(), 1000)
  } catch {
    // No audio available; the banner still shows.
  }
}

/** "(SOS) …" in the tab title while any SOS is open. */
function useSosTitle(count: number) {
  useEffect(() => {
    if (count === 0) return
    const original = document.title
    document.title = `(${count > 1 ? `${count} SOS` : 'SOS'}) ${original}`
    return () => {
      document.title = original
    }
  }, [count])
}
