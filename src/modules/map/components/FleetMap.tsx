import { locationQuality } from '@/modules/devices/lib/location'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoogleMaps } from '../hooks/useGoogleMaps'
import type { DeviceView, Presence } from '@/modules/devices/types'

// Matches the dot colours used in the device list, so a helmet reads the same
// on the map as it does in the table.
const PIN: Record<Presence, { background: string; border: string; glyph: string }> = {
  online: { background: '#10b981', border: '#047857', glyph: '#ffffff' },
  degraded: { background: '#fbbf24', border: '#b45309', glyph: '#ffffff' },
  offline: { background: '#cbd5e1', border: '#64748b', glyph: '#475569' },
}

const ALARM_PIN = { background: '#ef4444', border: '#991b1b', glyph: '#ffffff' }

interface Props {
  devices: DeviceView[]
  /** Centre on one helmet instead of fitting the whole fleet. */
  focusDeviceId?: string
  heightClass?: string
  /** Hands over the map once it exists, for layers drawn on top (fences). */
  onMapReady?: (map: google.maps.Map) => void
  /**
   * False while drawing a fence: a click meant for the map mustn't open a
   * helmet's page and lose the drawing.
   */
  markersClickable?: boolean
}

export function FleetMap({
  devices,
  focusDeviceId,
  heightClass = 'h-[28rem]',
  onMapReady,
  markersClickable = true,
}: Props) {
  const { status, libraries, mapId, error } = useGoogleMaps()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map())
  // The likely area around positions that aren't GPS fixes.
  const circlesRef = useRef<Map<string, google.maps.Circle>>(new Map())
  const navigate = useNavigate()
  // Read by the click listeners at click time, so toggling it doesn't mean
  // rebuilding every marker.
  const clickableRef = useRef(markersClickable)
  clickableRef.current = markersClickable

  const located = devices.filter((d) => d.telemetry.lat != null && d.telemetry.lng != null)

  // Create the map once. Re-creating it on every render would reset the
  // operator's pan and zoom every time a heartbeat arrives.
  useEffect(() => {
    if (status !== 'ready' || !libraries || !containerRef.current || mapRef.current) return

    mapRef.current = new libraries.maps.Map(containerRef.current, {
      center: { lat: 6.5244, lng: 3.3792 },
      zoom: 12,
      // Advanced markers refuse to render without this.
      mapId,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    })
    onMapReady?.(mapRef.current)
  }, [status, libraries, mapId, onMapReady])

  // Markers are reconciled in place — updated, added or removed — rather than
  // cleared and rebuilt, so a marker the operator has open doesn't vanish
  // underneath them every few seconds.
  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !libraries || !map) return

    const { AdvancedMarkerElement, PinElement } = libraries.marker
    const seen = new Set<string>()

    for (const device of located) {
      seen.add(device.id)
      const position = { lat: device.telemetry.lat as number, lng: device.telemetry.lng as number }
      const colours = device.activeAlarm ? ALARM_PIN : PIN[device.presence]

      const pin = new PinElement({
        background: colours.background,
        borderColor: colours.border,
        glyphColor: colours.glyph,
        scale: device.activeAlarm ? 1.2 : 1,
      })

      // Approximate positions (mobile network, Wi-Fi, no GPS) get a circle
      // for where the helmet probably is, so nobody takes the pin as exact.
      const quality = locationQuality(device.telemetry)
      const title = [device.name, device.site, quality?.label].filter(Boolean).join(' · ')
      const circle = circlesRef.current.get(device.id)
      if (quality?.approximate && quality.radiusM) {
        if (circle) {
          circle.setCenter(position)
          circle.setRadius(quality.radiusM)
        } else {
          circlesRef.current.set(
            device.id,
            new google.maps.Circle({
              map,
              center: position,
              radius: quality.radiusM,
              strokeColor: '#64748b',
              strokeOpacity: 0.6,
              strokeWeight: 1,
              fillColor: '#64748b',
              fillOpacity: 0.1,
              clickable: false,
            })
          )
        }
      } else if (circle) {
        circle.setMap(null)
        circlesRef.current.delete(device.id)
      }

      const existing = markersRef.current.get(device.id)
      if (existing) {
        existing.position = position
        existing.content = pin.element
        existing.title = title
        continue
      }

      const marker = new AdvancedMarkerElement({
        map,
        position,
        content: pin.element,
        title,
        gmpClickable: true,
      })
      marker.addListener('click', () => {
        if (clickableRef.current) navigate(`/devices/${device.id}`)
      })
      markersRef.current.set(device.id, marker)
    }

    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        marker.map = null
        markersRef.current.delete(id)
      }
    }
    for (const [id, circle] of circlesRef.current) {
      if (!seen.has(id)) {
        circle.setMap(null)
        circlesRef.current.delete(id)
      }
    }
  }, [status, libraries, located, navigate])

  // Fit the view once there's something to fit, then leave it alone.
  const fittedRef = useRef(false)
  useEffect(() => {
    const map = mapRef.current
    if (!map || fittedRef.current || located.length === 0) return

    if (focusDeviceId) {
      const target = located.find((d) => d.id === focusDeviceId)
      if (!target) return
      map.setCenter({ lat: target.telemetry.lat as number, lng: target.telemetry.lng as number })
      map.setZoom(16)
    } else {
      const bounds = new google.maps.LatLngBounds()
      for (const d of located) {
        bounds.extend({ lat: d.telemetry.lat as number, lng: d.telemetry.lng as number })
      }
      map.fitBounds(bounds, 48)
    }
    fittedRef.current = true
  }, [located, focusDeviceId, status])

  if (status === 'no-key') {
    return (
      <div className={`flex ${heightClass} items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-6`}>
        <div className="max-w-md text-center">
          <p className="text-sm font-medium text-slate-700">Map not configured</p>
          <p className="mt-1 text-xs text-slate-500">
            Add a Google Maps browser key as <code>VITE_GOOGLE_MAPS_API_KEY</code>{' '}
            in your <code>.env</code>, and restrict it by HTTP referrer at
            Google's end. Advanced markers also need{' '}
            <code>VITE_GOOGLE_MAPS_MAP_ID</code>; <code>DEMO_MAP_ID</code> is
            fine for development.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className={`flex ${heightClass} items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6`}>
        <p className="max-w-md text-center text-xs text-red-700">
          Google Maps failed to load. Check the key is valid, that the Maps
          JavaScript API is enabled on the project, and that this origin is
          allowed by the key's referrer restrictions.
          {error && <span className="mt-1 block text-red-500">{error}</span>}
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`${heightClass} w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100`}
      />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          Loading map…
        </div>
      )}
      {status === 'ready' && located.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <span className="rounded bg-white/90 px-2 py-1 text-xs text-slate-500 shadow">
            No helmets are reporting a location yet
          </span>
        </div>
      )}
    </div>
  )
}
