import { useEffect, useState } from 'react'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { env } from '@/config/env'
import { useTenant } from '@/shared/hooks/useTenant'

type Status = 'no-key' | 'loading' | 'ready' | 'error'

interface MapsLibraries {
  maps: google.maps.MapsLibrary
  marker: google.maps.MarkerLibrary
}

// Loader v2 uses a functional API — setOptions() then importLibrary() — and
// deprecated the Loader class. Options are global and can only sensibly be set
// once, so the whole load is cached per key rather than repeated per mount.
const loads = new Map<string, Promise<MapsLibraries>>()

function load(apiKey: string): Promise<MapsLibraries> {
  const cached = loads.get(apiKey)
  if (cached) return cached

  setOptions({ key: apiKey, v: 'weekly' })

  const promise = Promise.all([
    importLibrary('maps'),
    // Advanced markers live in their own library and don't exist without it.
    importLibrary('marker'),
  ]).then(([maps, marker]) => ({ maps, marker }))

  loads.set(apiKey, promise)
  return promise
}

/**
 * Resolves the Maps key and loads the API.
 *
 * Resolution order matters for the dual deployment model: a tenant's own key
 * wins, because in SaaS mode one bundle serves every customer and a build-time
 * key cannot be per-tenant. Standalone falls back to the env var.
 */
export function useGoogleMaps() {
  const tenant = useTenant()
  const apiKey = tenant?.mapsApiKey || env.googleMapsApiKey
  const mapId = tenant?.mapsMapId || env.googleMapsMapId

  const [status, setStatus] = useState<Status>(apiKey ? 'loading' : 'no-key')
  const [libraries, setLibraries] = useState<MapsLibraries | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!apiKey) {
      setStatus('no-key')
      return
    }

    let cancelled = false
    setStatus('loading')

    load(apiKey)
      .then((libs) => {
        if (cancelled) return
        setLibraries(libs)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        // A rejection here is usually a bad key, the Maps JavaScript API not
        // enabled on the project, or a referrer restriction blocking this
        // origin — not a network failure.
        setError(err instanceof Error ? err.message : 'Failed to load Google Maps')
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [apiKey])

  return { status, libraries, mapId, error }
}
