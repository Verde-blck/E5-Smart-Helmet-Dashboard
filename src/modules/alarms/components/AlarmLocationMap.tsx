import { useEffect, useRef } from 'react'
import { useGoogleMaps } from '@/modules/map/hooks/useGoogleMaps'

export function AlarmLocationMap({ lat, lng }: { lat: number; lng: number }) {
  const { status, libraries, mapId } = useGoogleMaps()
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<google.maps.Map | null>(null)
  const marker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)

  useEffect(() => {
    if (status !== 'ready' || !libraries || !container.current) return
    const position = { lat, lng }
    if (!map.current) {
      map.current = new libraries.maps.Map(container.current, {
        center: position,
        zoom: 17,
        mapId,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      })
    } else {
      map.current.setCenter(position)
    }
    const pin = new libraries.marker.PinElement({ background: '#dc2626', borderColor: '#991b1b', glyphColor: '#fff' })
    if (marker.current) {
      marker.current.position = position
    } else {
      marker.current = new libraries.marker.AdvancedMarkerElement({ map: map.current, position, content: pin.element })
    }
  }, [status, libraries, mapId, lat, lng])

  if (status === 'no-key' || status === 'error') return null
  return <div ref={container} className="h-48 w-full overflow-hidden rounded-md bg-slate-100" />
}
