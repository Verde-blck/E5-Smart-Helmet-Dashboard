import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { SessionMode } from '../api/live.api'
import { HelmetSession } from '../lib/session'
import type { SessionState } from '../lib/session'

const noopSubscribe = () => () => {}
const noState = () => null

/**
 * Owns at most one session for the component that uses it.
 *
 * Sessions start from a click, never from an effect. In development React
 * runs effects twice, and an effect-started session would send the helmet
 * start, stop, start in a fraction of a second. The effect below only ever
 * ends a session, which is safe to repeat.
 */
export function useHelmetSession(deviceId: string) {
  const [session, setSession] = useState<HelmetSession | null>(null)
  const sessionRef = useRef<HelmetSession | null>(null)

  const state = useSyncExternalStore(
    session ? session.subscribe : noopSubscribe,
    session ? session.getState : noState
  ) as SessionState | null

  const begin = useCallback(
    (mode: SessionMode, options: { withCamera?: boolean } = {}) => {
      sessionRef.current?.end()
      const next = new HelmetSession(deviceId, mode, options.withCamera ?? true)
      sessionRef.current = next
      setSession(next)
      void next.start()
    },
    [deviceId]
  )

  const end = useCallback(() => {
    sessionRef.current?.end()
    sessionRef.current = null
    setSession(null)
  }, [])

  // Leaving the page (or the component disappearing) ends the session.
  useEffect(() => () => sessionRef.current?.end(), [])

  return { session, state, begin, end }
}
