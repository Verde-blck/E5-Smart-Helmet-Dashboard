import { locationQuality } from '@/modules/devices/lib/location'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoogleMaps } from '../hooks/useGoogleMaps'
import { MapUnavailable } from './MapUnavailable'
import type { DeviceView, Presence } from '@/modules/devices/types'

const PIN: Record<Presence, { background: string; border: string; glyph: string }> = {
  online: { background: '#10b981', border: '#047857', glyph: '#ffffff' },
  degraded: { background: '#fbbf24', border: '#b45309', glyph: '#ffffff' },
  offline: { background: '#cbd5e1', border: '#64748b', glyph: '#475569' },
}

const ALARM_PIN = { background: '#ef4444', border: '#991b1b', glyph: '#ffffff' }

interface Props {
  devices: DeviceView[]
  focusDeviceId?: string
  heightClass?: string
  onMapReady?: (map: google.maps.Map) => void
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
  const circlesRef = useRef<Map<string, google.maps.Circle>>(new Map())
  const navigate = useNavigate()
  // Read at click time, so toggling it doesn't rebuild every marker.
  const clickableRef = useRef(markersClickable)
  clickableRef.current = markersClickable

  const located = devices.filter((d) => d.telemetry.lat != null && d.telemetry.lng != null)

  useEffect(() => {
    if (status !== 'ready' || !libraries || !containerRef.current || mapRef.current) return

    mapRef.current = new libraries.maps.Map(containerRef.current, {
      center: { lat: 6.5244, lng: 3.3792 },
      zoom: 12,
      mapId,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    })
    onMapReady?.(mapRef.current)
  }, [status, libraries, mapId, onMapReady])

  // Reconciled in place, so an open marker doesn't vanish on every poll.
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

  const fittedRef = useRef(false)
  // A new helmet to focus on (e.g. "View on map" while already here) re-runs the one-time fit.
  useEffect(() => {
    fittedRef.current = false
  }, [focusDeviceId])

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
      <MapUnavailable
        heightClass={heightClass}
        detail="No Google Maps key. Set VITE_GOOGLE_MAPS_API_KEY (and VITE_GOOGLE_MAPS_MAP_ID) and rebuild."
      />
    )
  }

  if (status === 'error') {
    return (
      <MapUnavailable
        heightClass={heightClass}
        detail={`Google Maps failed to load: check the key, that the Maps JavaScript API is enabled, and that this origin is allowed. ${error ?? ''}`}
      />
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
