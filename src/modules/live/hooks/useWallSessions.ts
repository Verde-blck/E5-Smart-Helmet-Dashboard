import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { HelmetSession } from '../lib/session'

export const WALL_MAX = 6

const PAUSE_AFTER_HIDDEN_MS = 60_000

export function useWallSessions({
  // Off for the wall window: some browsers report a window on another monitor as hidden.
  pauseWhenHidden = true,
}: { pauseWhenHidden?: boolean } = {}) {
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

  // Six hidden streams are about 5 GB an hour of helmet data, so disconnect after a minute hidden.
  useEffect(() => {
    if (!pauseWhenHidden) return
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
  }, [pauseWhenHidden])

  useEffect(() => {
    const map = sessions.current
    return () => {
      map.forEach((s) => s.end())
      map.clear()
    }
  }, [])

  return { start, stop, stopAll, get, paused, running: sessions.current.size }
}
