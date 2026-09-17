import { useEffect, useState } from 'react'

/**
 * A ticking clock. Needed because device presence is derived from a timestamp
 * rather than pushed as a status: without this, a helmet that dies silently
 * stays green forever, since no event ever arrives to change it.
 */
export function useNow(intervalMs = 10_000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
