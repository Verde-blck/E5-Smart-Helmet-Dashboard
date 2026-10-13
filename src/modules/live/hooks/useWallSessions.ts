import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { HelmetSession } from '../lib/session'

/** Cypher's suggestion: six fits a 3 × 2 grid and keeps data use sensible. */
export const WALL_MAX = 6

/** Hidden this long (another tab, minimised) and the streams are stopped to save data. */
const PAUSE_AFTER_HIDDEN_MS = 60_000

/**
 * The live sessions behind the wall, one per helmet.
 *
 * Kept in a ref-held map rather than per-tile hooks so sessions are only ever
 * started by a click or by returning to the tab, never by a component
 * mounting (see useHelmetSession for why that matters). Leaving the wall
 * disconnects from every helmet; the server stops the ones nobody else is
 * watching.
 */
export function useWallSessions() {
  const sessions = useRef(new Map<string, HelmetSession>())
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const [paused, setPaused] = useState<string[]>([])
  const pausedRef = useRef<string[]>([])

  const start = useCallback((deviceId: string) => {
    sessions.current.get(deviceId)?.end()
    const session = new HelmetSession(deviceId, 'watch')
    sessions.current.set(deviceId, session)
    rerender()
    void session.start()
  }, [])

  const stop = useCallback((deviceId: string) => {
    sessions.current.get(deviceId)?.end()
    sessions.current.delete(deviceId)
    rerender()
  }, [])

  const stopAll = useCallback(() => {
    sessions.current.forEach((s) => s.end())
    sessions.current.clear()
    pausedRef.current = []
    setPaused([])
    rerender()
  }, [])

  const get = useCallback((deviceId: string) => sessions.current.get(deviceId) ?? null, [])

  // Six helmets streaming to a tab nobody is looking at is about 5 GB an hour
  // of their mobile data. After a minute hidden, disconnect from them; the
  // media server then stops each helmet about 20 seconds later, unless
  // someone else is watching it. When the tab comes back, rejoin the same ones.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    const onVisibility = () => {
      if (document.hidden) {
        timer = setTimeout(() => {
          const running = [...sessions.current.keys()]
          if (running.length === 0) return
          sessions.current.forEach((s) => s.end())
          sessions.current.clear()
          pausedRef.current = running
          setPaused(running)
          rerender()
        }, PAUSE_AFTER_HIDDEN_MS)
      } else {
        if (timer) clearTimeout(timer)
        timer = null
        const toResume = pausedRef.current
        pausedRef.current = []
        setPaused([])
        toResume.forEach((id) => {
          const session = new HelmetSession(id, 'watch')
          sessions.current.set(id, session)
          void session.start()
        })
        if (toResume.length) rerender()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (timer) clearTimeout(timer)
    }
  }, [])

  // Leaving Monitoring Center, or switching away from the wall view.
  useEffect(() => {
    const map = sessions.current
    return () => {
      map.forEach((s) => s.end())
      map.clear()
    }
  }, [])

  return { start, stop, stopAll, get, paused, running: sessions.current.size }
}
