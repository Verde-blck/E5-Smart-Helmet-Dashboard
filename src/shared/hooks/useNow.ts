import { useEffect, useState } from 'react'

// Presence is derived from timestamps, so without a ticking clock a silently dead helmet stays
// green.
export function useNow(intervalMs = 10_000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
