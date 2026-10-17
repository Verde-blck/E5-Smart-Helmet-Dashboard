import { useCallback, useState } from 'react'
import { useDevices } from '@/modules/devices/hooks/useDevices'
import { formatLastSeen } from '@/modules/devices/lib/presence'
import { FenceEditor } from '@/modules/fences/components/FenceEditor'
import { FenceList } from '@/modules/fences/components/FenceList'
import { DrawLayer, FenceShapes } from '@/modules/fences/components/FenceOverlays'
import { useDeleteFence, useFences, useSaveFence } from '@/modules/fences/hooks/useFences'
import { fenceErrorMessage } from '@/modules/fences/api/fences.api'
import { EMPTY_DRAFT } from '@/modules/fences/types'
import type { Fence, FenceDraft } from '@/modules/fences/types'
import { FleetMap } from './components/FleetMap'
import { usePermission } from '@/shared/hooks/usePermission'

type Editing = { id?: number; draft: FenceDraft } | null

/** Pans and zooms to show one fence. */
function showFence(map: google.maps.Map, fence: Fence) {
  if (fence.type === 'ROUND' && fence.center) {
    const circle = new google.maps.Circle({ center: fence.center, radius: fence.radiusMeters })
    const bounds = circle.getBounds()
    if (bounds) map.fitBounds(bounds, 48)
  } else if (fence.points.length) {
    const bounds = new google.maps.LatLngBounds()
    fence.points.forEach((p) => bounds.extend(p))
    map.fitBounds(bounds, 48)
  }
}

export function MapPage() {
  const { devices, now, isLoading } = useDevices()
  const can = usePermission()
  const canSeeFences = can('fences:read')
  const { fences: loadedFences, isLoading: fencesLoading, isError: fencesError } = useFences(canSeeFences)
  const fences = canSeeFences ? loadedFences : []
  const saveFence = useSaveFence()
  const deleteFence = useDeleteFence()

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [showFences, setShowFences] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const located = devices.filter((d) => d.telemetry.lat != null)
  const alarming = devices.filter((d) => d.activeAlarm !== null)
  // A helmet with no fix isn't on the map, and an operator counting pins
  // needs to know that rather than assume the fleet is smaller.
  const missing = devices.length - located.length

  const stale = located
    .filter((d) => d.presence !== 'online')
    .sort((a, b) => a.lastSeenAt - b.lastSeenAt)

  const selectFence = useCallback(
    (id: number) => {
      setSelectedId(id)
      setPanelOpen(true)
      const fence = fences.find((f) => f.id === id)
      if (map && fence) showFence(map, fence)
    },
    [fences, map]
  )

  const patchDraft = useCallback(
    (patch: Partial<FenceDraft>) =>
      setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e)),
    []
  )

  function startNew() {
    setSaveError(null)
    setShowFences(true)
    setEditing({ draft: { ...EMPTY_DRAFT } })
  }

  function startEdit(fence: Fence) {
    setSaveError(null)
    setShowFences(true)
    setSelectedId(fence.id)
    const { id, hasWarningAudio: _ignored, ...draft } = fence
    setEditing({ id, draft })
    if (map) showFence(map, fence)
  }

  function save(clip: Blob | null | undefined) {
    if (!editing) return
    setSaveError(null)
    saveFence.mutate(
      { draft: editing.draft, id: editing.id, clip },
      {
        onSuccess: (saved) => {
          setEditing(null)
          setSelectedId(saved.id)
        },
        onError: (error) => setSaveError(fenceErrorMessage(error)),
      }
    )
  }

  const existing = editing?.id != null ? fences.find((f) => f.id === editing.id) : undefined

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {located.length} of {devices.length} helmets reporting a position
          {missing > 0 && ` · ${missing} without a fix`}
          {alarming.length > 0 && ` · ${alarming.length} in alarm`}
        </p>
        {canSeeFences && <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={showFences}
              onChange={(e) => setShowFences(e.target.checked)}
              disabled={!!editing}
              className="accent-brand-primary"
            />
            Show fences
          </label>
          <button
            onClick={() => setPanelOpen((o) => !o)}
            disabled={!!editing}
            aria-pressed={panelOpen}
            className={`rounded border px-2.5 py-1 text-xs ${
              panelOpen
                ? 'border-brand-primary bg-brand-primary/10 font-medium text-slate-900'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            } disabled:opacity-50`}
          >
            Fences{fences.length ? ` (${fences.length})` : ''}
          </button>
        </div>}
      </div>

      <div className={panelOpen || editing ? 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]' : ''}>
        <div className="min-w-0">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading fleet…</p>
          ) : (
            <FleetMap
              devices={devices}
              onMapReady={setMap}
              markersClickable={!editing}
              heightClass={panelOpen || editing ? 'h-[36rem]' : 'h-[28rem]'}
            />
          )}
          {map && showFences && (
            <FenceShapes
              map={map}
              fences={fences}
              hiddenId={editing?.id}
              dimmed={!!editing}
              onSelect={selectFence}
            />
          )}
          {map && editing && <DrawLayer map={map} draft={editing.draft} onChange={patchDraft} />}
        </div>

        {(panelOpen || editing) && (
          <aside className="rounded-lg border border-slate-200 bg-white p-4 lg:max-h-[36rem] lg:overflow-y-auto">
            {editing ? (
              <FenceEditor
                draft={editing.draft}
                onChange={patchDraft}
                existing={existing}
                devices={devices}
                saving={saveFence.isPending}
                error={saveError}
                onSave={save}
                onCancel={() => {
                  setEditing(null)
                  setSaveError(null)
                }}
              />
            ) : (
              <FenceList
                fences={fences}
                isLoading={fencesLoading}
                isError={fencesError}
                selectedId={selectedId}
                onSelect={selectFence}
                onNew={startNew}
                onEdit={startEdit}
                onDelete={async (fence) => {
                  await deleteFence.mutateAsync(fence.id)
                  if (selectedId === fence.id) setSelectedId(null)
                }}
              />
            )}
          </aside>
        )}
      </div>

      {stale.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Positions shown for {stale.length}{' '}
          {stale.length === 1 ? 'helmet' : 'helmets'} are last-known, not live —
          oldest {formatLastSeen(stale[0].lastSeenAt, now)}.
        </p>
      )}
    </div>
  )
}
