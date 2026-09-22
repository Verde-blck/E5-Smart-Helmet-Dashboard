import { useEffect, useRef } from 'react'
import { useGoogleMaps } from '@/modules/map/hooks/useGoogleMaps'
import { segmentsOf } from '../lib/track'
import type { Track } from '../types'

/**
 * The route drawn as a line, with start and end pinned and a marker at the
 * current playback position.
 *
 * Kept separate from FleetMap: that one plots independent helmets, this one
 * plots one helmet over time. Sharing a component would mean a props object
 * full of mutually exclusive options.
 */
export function TrackMap({
  track,
  cursor,
  heightClass = 'h-[26rem]',
}: {
  track: Track
  /** Index of the point to highlight. */
  cursor: number
  heightClass?: string
}) {
  const { status, libraries, mapId, error } = useGoogleMaps()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const linesRef = useRef<google.maps.Polyline[]>([])
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const cursorRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)

  useEffect(() => {
    if (status !== 'ready' || !libraries || !containerRef.current || mapRef.current) return
    mapRef.current = new libraries.maps.Map(containerRef.current, {
      center: { lat: 6.5244, lng: 3.3792 },
      zoom: 15,
      mapId,
      mapTypeControl: true,
      streetViewControl: false,
    })
  }, [status, libraries, mapId])

  // Redraw the route whenever the track changes, and fit the view to it once.
  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !libraries || !map) return

    linesRef.current.forEach((line) => line.setMap(null))
    linesRef.current = []
    markersRef.current.forEach((m) => (m.map = null))
    markersRef.current = []

    if (track.points.length === 0) return

    // One line per continuous run. Drawing a single polyline across the whole
    // track would connect a coverage gap — or a bad fix on another continent —
    // with a straight line that never happened.
    const runs = segmentsOf(track.points)

    for (const run of runs) {
      linesRef.current.push(
        new google.maps.Polyline({
          path: run.map((p) => ({ lat: p.lat, lng: p.lng })),
          map,
          strokeColor: '#0f766e',
          strokeOpacity: 0.85,
          strokeWeight: 3,
        })
      )
    }

    const { AdvancedMarkerElement, PinElement } = libraries.marker

    const endpoint = (point: { lat: number; lng: number; ts: number }, background: string, glyph: string) => {
      const pin = new PinElement({ background, borderColor: '#334155', glyphColor: '#fff', glyph })
      markersRef.current.push(
        new AdvancedMarkerElement({
          map,
          position: { lat: point.lat, lng: point.lng },
          content: pin.element,
          title: new Date(point.ts).toLocaleString(),
        })
      )
    }

    endpoint(track.points[0], '#10b981', 'A')
    if (track.points.length > 1) endpoint(track.points[track.points.length - 1], '#ef4444', 'B')

    // Fit to the longest run rather than everything. With an out-of-region
    // fix in the history, fitting all of it zooms out to show two continents
    // and the actual route becomes a dot.
    const largest = runs.reduce((best, run) => (run.length > best.length ? run : best), runs[0])
    const bounds = new google.maps.LatLngBounds()
    largest.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }))
    map.fitBounds(bounds, 48)
  }, [status, libraries, track])

  // Move the cursor marker without touching the route or the viewport.
  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !libraries || !map) return

    const point = track.points[cursor]
    if (!point) return

    const position = { lat: point.lat, lng: point.lng }

    if (!cursorRef.current) {
      const pin = new libraries.marker.PinElement({
        background: '#f59e0b',
        borderColor: '#b45309',
        glyphColor: '#fff',
        scale: 1.1,
      })
      cursorRef.current = new libraries.marker.AdvancedMarkerElement({
        map,
        position,
        content: pin.element,
        zIndex: 10,
      })
    } else {
      cursorRef.current.position = position
    }
  }, [status, libraries, track, cursor])

  if (status === 'no-key') {
    return (
      <div className={`flex ${heightClass} items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-6`}>
        <div className="max-w-md text-center">
          <p className="text-sm font-medium text-slate-700">Map not configured</p>
          <p className="mt-1 text-xs text-slate-500">
            {/* The track itself still loads — stats and export work without a
                key, so the module is usable before billing is sorted out. */}
            Add a Google Maps browser key to see the route drawn. The track,
            its statistics and the CSV export all work without one.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className={`flex ${heightClass} items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6`}>
        <p className="max-w-md text-center text-xs text-red-700">
          Google Maps failed to load.{error && <span className="mt-1 block">{error}</span>}
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`${heightClass} w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100`}
    />
  )
}
