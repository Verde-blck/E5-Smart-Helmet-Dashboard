import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { GroupCallSession } from '../lib/groupSession'
import type { GroupCallState } from '../lib/groupSession'

const noopSubscribe = () => () => {}
const noState = () => null

/**
 * At most one group call for the page. Started only from a click (see
 * useHelmetSession for why); leaving the page hangs up.
 */
export function useGroupCall() {
  const [session, setSession] = useState<GroupCallSession | null>(null)
  const ref = useRef<GroupCallSession | null>(null)

  const state = useSyncExternalStore(
    session ? session.subscribe : noopSubscribe,
    session ? session.getState : noState
  ) as GroupCallState | null

  const open = useCallback((withCamera: boolean) => {
    ref.current?.end()
    const next = new GroupCallSession(withCamera)
    ref.current = next
    setSession(next)
    return next
  }, [])

  const start = useCallback(
    (deviceIds: string[], withCamera: boolean) => void open(withCamera).start(deviceIds),
    [open]
  )

  const rejoin = useCallback(
    (callId: string, withCamera: boolean) => void open(withCamera).rejoin(callId),
    [open]
  )

  const hangUp = useCallback(() => {
    ref.current?.end()
    ref.current = null
    setSession(null)
  }, [])

  useEffect(() => () => ref.current?.end(), [])

  return { session, state, start, rejoin, hangUp }
}
