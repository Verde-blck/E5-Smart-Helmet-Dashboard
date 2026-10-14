import { useEffect, useRef } from 'react'
import type { Fence, FenceDraft } from '../types'

/** Work areas in the brand teal; no-entry zones in amber. Red stays for alarms. */
function styleFor(fence: Pick<Fence, 'behavior' | 'active'>, dimmed: boolean) {
  if (!fence.active) {
    return { strokeColor: '#94a3b8', fillColor: '#94a3b8', fillOpacity: 0.06, strokeOpacity: 0.7 }
  }
  const color = fence.behavior === 'NO_ENTRY' ? '#d97706' : '#0A6659'
  return {
    strokeColor: color,
    fillColor: color,
    fillOpacity: dimmed ? 0.05 : fence.behavior === 'NO_ENTRY' ? 0.18 : 0.1,
    strokeOpacity: dimmed ? 0.4 : 0.9,
  }
}

/**
 * Saved fences, drawn under the helmet pins. Rebuilt when the list changes,
 * which only happens on a save, so there's nothing to reconcile.
 */
export function FenceShapes({
  map,
  fences,
  hiddenId,
  dimmed,
  onSelect,
}: {
  map: google.maps.Map
  fences: Fence[]
  /** The fence being edited, drawn by DrawLayer instead. */
  hiddenId?: number
  /** While editing, other fences fade and stop taking clicks. */
  dimmed: boolean
  onSelect?: (id: number) => void
}) {
  useEffect(() => {
    const shapes: (google.maps.Circle | google.maps.Polygon)[] = []
    for (const fence of fences) {
      if (fence.id === hiddenId) continue
      const common = {
        map,
        ...styleFor(fence, dimmed),
        strokeWeight: 2,
        clickable: !dimmed && !!onSelect,
        zIndex: 1,
      }
      const shape =
        fence.type === 'ROUND' && fence.center
          ? new google.maps.Circle({ ...common, center: fence.center, radius: fence.radiusMeters })
          : fence.type === 'POLYGON' && fence.points.length >= 3
            ? new google.maps.Polygon({ ...common, paths: fence.points })
            : null
      if (!shape) continue
      if (onSelect) shape.addListener('click', () => onSelect(fence.id))
      shapes.push(shape)
    }
    return () => shapes.forEach((s) => s.setMap(null))
  }, [map, fences, hiddenId, dimmed, onSelect])

  return null
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9

/**
 * The fence being drawn. Clicks on the map place the circle's centre or add
 * polygon corners; the shape is editable, so corners and the circle's edge
 * can be dragged. Changes flow back through onChange; changes from the form
 * (typing a radius) flow in, without echoing back.
 */
export function DrawLayer({
  map,
  draft,
  onChange,
}: {
  map: google.maps.Map
  draft: FenceDraft
  onChange: (patch: Partial<FenceDraft>) => void
}) {
  const circleRef = useRef<google.maps.Circle | null>(null)
  const polygonRef = useRef<google.maps.Polygon | null>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Crosshair while drawing, and clicks that build the shape.
  useEffect(() => {
    map.setOptions({ draggableCursor: 'crosshair' })
    const listener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return
      const point = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      const d = draftRef.current
      if (d.type === 'ROUND') {
        // The first click places it; after that, drag it.
        if (!d.center) onChangeRef.current({ center: point })
      } else {
        onChangeRef.current({ points: [...d.points, point] })
      }
    })
    return () => {
      listener.remove()
      map.setOptions({ draggableCursor: null })
    }
  }, [map])

  const style = {
    ...styleFor(draft, false),
    strokeWeight: 3,
    strokeOpacity: 1,
    editable: true,
    draggable: true,
    zIndex: 2,
  }

  // Circle: created once it has a centre, then kept in step with the draft.
  useEffect(() => {
    if (draft.type !== 'ROUND' || !draft.center) {
      circleRef.current?.setMap(null)
      circleRef.current = null
      return
    }
    let circle = circleRef.current
    if (!circle) {
      circle = new google.maps.Circle({ map, ...style, center: draft.center, radius: draft.radiusMeters })
      circleRef.current = circle
      const c = circle
      c.addListener('center_changed', () => {
        const at = c.getCenter()
        const cur = draftRef.current.center
        if (at && (!cur || !near(at.lat(), cur.lat) || !near(at.lng(), cur.lng))) {
          onChangeRef.current({ center: { lat: at.lat(), lng: at.lng() } })
        }
      })
      c.addListener('radius_changed', () => {
        const r = Math.round(c.getRadius())
        if (r !== Math.round(draftRef.current.radiusMeters)) onChangeRef.current({ radiusMeters: r })
      })
    } else {
      const at = circle.getCenter()
      if (!at || !near(at.lat(), draft.center.lat) || !near(at.lng(), draft.center.lng)) {
        circle.setCenter(draft.center)
      }
      if (Math.round(circle.getRadius()) !== Math.round(draft.radiusMeters)) {
        circle.setRadius(draft.radiusMeters)
      }
      circle.setOptions(styleFor(draft, false))
    }
  }, [map, draft.type, draft.center, draft.radiusMeters, draft.behavior, draft.active]) // eslint-disable-line react-hooks/exhaustive-deps

  // Polygon: one shape for the whole edit. A drag changes its path, which
  // flows to the draft; the draft then matches the path, so nothing is
  // rebuilt mid-drag. Clicks, undo and clear change the draft, which is
  // pushed into the path.
  const pathListeners = useRef<google.maps.MapsEventListener[]>([])

  useEffect(() => {
    if (draft.type !== 'POLYGON' || draft.points.length === 0) {
      pathListeners.current.forEach((l) => l.remove())
      pathListeners.current = []
      polygonRef.current?.setMap(null)
      polygonRef.current = null
      return
    }

    let polygon = polygonRef.current
    if (!polygon) {
      polygon = new google.maps.Polygon({ map, ...style, paths: draft.points })
      polygonRef.current = polygon
      // Clicking inside the shape adds a corner, as clicks outside do.
      polygon.addListener('click', (e: google.maps.PolyMouseEvent) => {
        if (e.vertex != null || e.edge != null || !e.latLng) return
        onChangeRef.current({
          points: [...draftRef.current.points, { lat: e.latLng.lat(), lng: e.latLng.lng() }],
        })
      })
    } else {
      const current = polygon.getPath().getArray()
      const same =
        current.length === draft.points.length &&
        current.every((p, i) => near(p.lat(), draft.points[i].lat) && near(p.lng(), draft.points[i].lng))
      if (!same) polygon.setPath(draft.points)
      polygon.setOptions(styleFor(draft, false))
    }

    // (Re)bind to the current path; setPath replaces it.
    pathListeners.current.forEach((l) => l.remove())
    const path = polygon.getPath()
    const sync = () => {
      onChangeRef.current({ points: path.getArray().map((p) => ({ lat: p.lat(), lng: p.lng() })) })
    }
    pathListeners.current = [
      path.addListener('set_at', sync),
      path.addListener('insert_at', sync),
      path.addListener('remove_at', sync),
    ]
  }, [map, draft.type, draft.points, draft.behavior, draft.active]) // eslint-disable-line react-hooks/exhaustive-deps

  // Remove everything on the way out.
  useEffect(
    () => () => {
      pathListeners.current.forEach((l) => l.remove())
      circleRef.current?.setMap(null)
      polygonRef.current?.setMap(null)
    },
    []
  )

  return null
}
