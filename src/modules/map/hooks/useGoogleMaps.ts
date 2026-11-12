import { useCallback, useEffect, useState } from 'react'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { TimeoutError, withTimeout } from '@/shared/lib/withTimeout'
import { env } from '@/config/env'
import { useTenant } from '@/shared/hooks/useTenant'

type Status = 'no-key' | 'loading' | 'ready' | 'error'

interface MapsLibraries {
  maps: google.maps.MapsLibrary
  marker: google.maps.MarkerLibrary
}

// Cached per key, so the loader runs once rather than on every mount.
const loads = new Map<string, Promise<MapsLibraries>>()

function load(apiKey: string): Promise<MapsLibraries> {
  const cached = loads.get(apiKey)
  if (cached) return cached

  setOptions({ key: apiKey, v: 'weekly' })

  const promise = Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
  ]).then(([maps, marker]) => ({ maps, marker }))

  loads.set(apiKey, promise)
  // A failed load isn't kept, so returning to the page tries again.
  promise.catch(() => loads.delete(apiKey))
  return promise
}

// Long enough for a slow connection; without a limit a load that never finishes shows
// "Loading map…" forever.
const LOAD_LIMIT_MS = 15_000

export function useGoogleMaps() {
  const tenant = useTenant()
  const apiKey = tenant?.mapsApiKey || env.googleMapsApiKey
  const mapId = tenant?.mapsMapId || env.googleMapsMapId

  const [status, setStatus] = useState<Status>(apiKey ? 'loading' : 'no-key')

  // Google reports auth failures through this global, not by rejecting the loader, which would
  // otherwise resolve and show a blank map.
  useEffect(() => {
    const previous = window.gm_authFailure
    window.gm_authFailure = () => {
      setStatus('error')
      setError(
        "Google rejected the key for this address. Check the key's HTTP " +
          'referrer restrictions include this site, and that billing is ' +
          'enabled on the project.'
      )
      previous?.()
    }
    return () => {
      window.gm_authFailure = previous
    }
  }, [])
  const [libraries, setLibraries] = useState<MapsLibraries | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!apiKey) {
      setStatus('no-key')
      return
    }

    let cancelled = false
    setStatus('loading')

    withTimeout(load(apiKey), LOAD_LIMIT_MS)
      .then((libs) => {
        if (cancelled) return
        setLibraries(libs)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof TimeoutError
            ? `Google Maps didn't finish loading within ${LOAD_LIMIT_MS / 1000} s.`
            : err instanceof Error
              ? err.message
              : 'Failed to load Google Maps'
        )
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [apiKey])

  // For failures after loading, such as the map itself refusing to start.
  const fail = useCallback((reason: unknown) => {
    setError(`Google Maps couldn't start the map: ${reason instanceof Error ? reason.message : String(reason)}`)
    setStatus('error')
  }, [])

  return { status, libraries, mapId, error, fail }
}