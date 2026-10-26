import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { SessionMode } from '../api/live.api'
import { HelmetSession } from '../lib/session'
import type { SessionState } from '../lib/session'

const noopSubscribe = () => () => {}
const noState = () => null

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

  useEffect(() => () => sessionRef.current?.end(), [])

  return { session, state, begin, end }
}
