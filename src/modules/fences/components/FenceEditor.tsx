import { useEffect, useState } from 'react'
import { useVoiceRecorder } from '@/modules/messaging/hooks/useVoiceRecorder'
import type { DeviceView } from '@/modules/devices/types'
import { WARNING_AUDIO_MAX_BYTES } from '../api/fences.api'
import { describePeriod, isTooSmall, narrowestAcrossM, validateDraft } from '../lib/geometry'
import { BEHAVIOR_LABEL, FREQUENCIES, MIN_FENCE_ACROSS_M } from '../types'
import type { Fence, FenceBehavior, FenceDraft, FenceFrequency } from '../types'

const input = 'w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm'
const label = 'mb-1 block text-xs font-medium text-slate-600'

interface Props {
  draft: FenceDraft
  onChange: (patch: Partial<FenceDraft>) => void
  /** The saved fence when editing; undefined for a new one. */
  existing?: Fence
  devices: DeviceView[]
  saving: boolean
  error: string | null
  /** clip: new Blob to attach, null to remove the current one, undefined to leave it. */
  onSave: (clip: Blob | null | undefined) => void
  onCancel: () => void
}

export function FenceEditor({ draft, onChange, existing, devices, saving, error, onSave, onCancel }: Props) {
  const [showProblems, setShowProblems] = useState(false)
  const [clip, setClip] = useState<{ blob: Blob; url: string } | null>(null)
  const [removeClip, setRemoveClip] = useState(false)
  const [clipError, setClipError] = useState<string | null>(null)
  const recorder = useVoiceRecorder()

  useEffect(() => () => {
    if (clip) URL.revokeObjectURL(clip.url)
  }, [clip])

  const problems = validateDraft(draft)
  const across = narrowestAcrossM(draft)
  const tooSmall = isTooSmall(draft)
  const allHelmets = draft.deviceIds.length === 0

  function stageClip(blob: Blob) {
    if (blob.size > WARNING_AUDIO_MAX_BYTES) {
      setClipError('That clip is over 5 MB. Keep it to a short sentence.')
      return
    }
    setClipError(null)
    setRemoveClip(false)
    setClip({ blob, url: URL.createObjectURL(blob) })
  }

  function save() {
    if (problems.length) {
      setShowProblems(true)
      return
    }
    onSave(clip ? clip.blob : removeClip ? null : undefined)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          {existing ? `Edit ${existing.name}` : 'New fence'}
        </h3>
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-800">
          Cancel
        </button>
      </div>

      <div>
        <label className={label} htmlFor="fence-name">Name</label>
        <input
          id="fence-name"
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Site A work area"
          className={input}
        />
      </div>

      {/* Shape and drawing */}
      <div>
        <span className={label}>Shape</span>
        <div className="inline-flex rounded-md border border-slate-200 p-0.5 text-sm">
          {(['ROUND', 'POLYGON'] as const).map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() =>
                shape !== draft.type &&
                onChange({ type: shape, center: null, points: [] })
              }
              aria-pressed={draft.type === shape}
              className={`rounded px-3 py-1 ${
                draft.type === shape ? 'bg-brand-primary/10 font-medium text-slate-900' : 'text-slate-500'
              }`}
            >
              {shape === 'ROUND' ? 'Circle' : 'Polygon'}
            </button>
          ))}
        </div>

        <div className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {draft.type === 'ROUND' ? (
            draft.center ? (
              <div className="space-y-2">
                <p>Drag the circle to move it, or its edge to resize.</p>
                <label className="flex items-center gap-2">
                  Radius
                  <input
                    type="number"
                    min={1}
                    value={Math.round(draft.radiusMeters)}
                    onChange={(e) => onChange({ radiusMeters: Number(e.target.value) })}
                    className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  m
                </label>
                <button
                  type="button"
                  onClick={() => onChange({ center: null })}
                  className="text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
                >
                  Place again
                </button>
              </div>
            ) : (
              <p className="font-medium text-slate-700">Click the map to place the centre.</p>
            )
          ) : (
            <div className="space-y-2">
              <p className={draft.points.length < 3 ? 'font-medium text-slate-700' : ''}>
                {draft.points.length < 3
                  ? `Click the map to add corners: ${draft.points.length} of at least 3.`
                  : `${draft.points.length} corners. Drag a corner to move it, or the midpoint of an edge to add one.`}
              </p>
              {draft.points.length > 0 && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => onChange({ points: draft.points.slice(0, -1) })}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    Undo last corner
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ points: [] })}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {tooSmall && across !== null && (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This fence is about {Math.round(across)} m across. GPS can drift 10 to 50 m indoors or on a
            weak signal, so fences under {MIN_FENCE_ACROSS_M} m across tend to raise false alarms.
          </p>
        )}
      </div>

      {/* Behaviour */}
      <fieldset>
        <legend className={label}>Type</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['FORBIDDEN_TO_LEAVE', 'NO_ENTRY'] as FenceBehavior[]).map((b) => (
            <label
              key={b}
              className={`cursor-pointer rounded-md border px-3 py-2 text-xs ${
                draft.behavior === b ? 'border-brand-primary bg-brand-primary/5' : 'border-slate-200'
              }`}
            >
              <input
                type="radio"
                name="fence-behavior"
                checked={draft.behavior === b}
                onChange={() => onChange({ behavior: b })}
                className="sr-only"
              />
              <span className="flex items-center gap-1.5 font-medium text-slate-800">
                <span
                  className={`h-2.5 w-2.5 rounded-sm ${b === 'NO_ENTRY' ? 'bg-amber-500' : 'bg-[#0A6659]'}`}
                />
                {BEHAVIOR_LABEL[b].short}
              </span>
              <span className="mt-0.5 block text-slate-500">{BEHAVIOR_LABEL[b].long}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Alarm repeat */}
      <div>
        <label className={label} htmlFor="fence-freq">Repeat the alarm while in breach</label>
        <select
          id="fence-freq"
          value={draft.frequencyMinutes}
          onChange={(e) => onChange({ frequencyMinutes: Number(e.target.value) as FenceFrequency })}
          className={input}
        >
          {FREQUENCIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-400">
      
          {draft.frequencyMinutes === 0 && ' Every report is about every 10 seconds, which can be a lot of alarms.'}
        </p>
      </div>

      {/* Active hours */}
      <div>
        <span className={label}>Active hours (Lagos time)</span>
        {draft.validPeriods.length === 0 ? (
          <p className="text-xs text-slate-500">Always active.</p>
        ) : (
          <ul className="space-y-1.5">
            {draft.validPeriods.map((p, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-xs">
                <input
                  type="time"
                  value={p.start}
                  aria-label={`Hours ${i + 1} start`}
                  onChange={(e) =>
                    onChange({
                      validPeriods: draft.validPeriods.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)),
                    })
                  }
                  className="rounded border border-slate-300 px-2 py-1"
                />
                to
                <input
                  type="time"
                  value={p.end}
                  aria-label={`Hours ${i + 1} end`}
                  onChange={(e) =>
                    onChange({
                      validPeriods: draft.validPeriods.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)),
                    })
                  }
                  className="rounded border border-slate-300 px-2 py-1"
                />
                {p.start && p.end && p.end < p.start && (
                  <span className="text-slate-400">overnight</span>
                )}
                <button
                  type="button"
                  onClick={() => onChange({ validPeriods: draft.validPeriods.filter((_, j) => j !== i) })}
                  aria-label={`Remove hours ${i + 1}`}
                  className="ml-auto text-slate-400 hover:text-slate-700"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() =>
            onChange({ validPeriods: [...draft.validPeriods, { start: '08:00', end: '17:00' }] })
          }
          className="mt-1.5 text-xs font-medium text-brand-primary hover:underline"
        >
          {draft.validPeriods.length ? 'Add more hours' : 'Limit to certain hours'}
        </button>
      </div>

      {/* Helmets */}
      <div>
        <span className={label}>Helmets</span>
        <div className="flex gap-4 text-xs">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={allHelmets}
              onChange={() => onChange({ deviceIds: [] })}
              className="accent-brand-primary"
            />
            Every helmet
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={!allHelmets}
              onChange={() => onChange({ deviceIds: devices.slice(0, 1).map((d) => d.id) })}
              disabled={devices.length === 0}
              className="accent-brand-primary"
            />
            Chosen helmets
          </label>
        </div>
        {!allHelmets && (
          <div className="mt-2 max-h-40 divide-y divide-slate-100 overflow-y-auto rounded border border-slate-200">
            {devices.map((d) => (
              <label key={d.id} className="flex items-center gap-2 px-2.5 py-1 text-xs hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={draft.deviceIds.includes(d.id)}
                  onChange={() => {
                    const next = draft.deviceIds.includes(d.id)
                      ? draft.deviceIds.filter((id) => id !== d.id)
                      : [...draft.deviceIds, d.id]
                    // Unticking the last one would silently mean "every helmet".
                    if (next.length > 0) onChange({ deviceIds: next })
                  }}
                  className="accent-brand-primary"
                />
                <span className="truncate text-slate-700">{d.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Warning clip */}
      <div>
        <span className={label}>Warning played on the helmet (optional)</span>
        <p className="mb-1.5 text-[11px] text-slate-400">
           “You have left the work area.” 
        </p>
        {clip ? (
          <div className="space-y-1.5">
            <audio controls src={clip.url} className="h-8 w-full" />
            <button
              type="button"
              onClick={() => setClip(null)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Discard new clip
            </button>
          </div>
        ) : existing?.hasWarningAudio && !removeClip ? (
          <div className="flex items-center gap-3 text-xs text-slate-600">
            A warning clip is attached.
            <button
              type="button"
              onClick={() => setRemoveClip(true)}
              className="text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : null}
        {!clip && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {recorder.state === 'recording' ? (
              <button
                type="button"
                onClick={async () => {
                  const wav = await recorder.stop()
                  if (wav) stageClip(wav)
                }}
                className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white"
              >
                Stop {Math.floor(recorder.elapsedMs / 1000)}s
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void recorder.start()}
                disabled={recorder.state === 'requesting' || recorder.state === 'converting'}
                className="rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {existing?.hasWarningAudio && !removeClip ? 'Record a replacement' : 'Record a clip'}
              </button>
            )}
            <label className="cursor-pointer text-xs text-slate-500 hover:text-slate-800">
              or upload a file
              <input
                type="file"
                accept="audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) stageClip(file)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        )}
        {removeClip && !clip && (
          <p className="mt-1 text-xs text-slate-500">
            The current clip will be removed when you save.{' '}
            <button type="button" onClick={() => setRemoveClip(false)} className="underline">
              Keep it
            </button>
          </p>
        )}
        {(clipError || recorder.error) && (
          <p className="mt-1 text-xs text-red-600">{clipError ?? recorder.error}</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => onChange({ active: e.target.checked })}
          className="accent-brand-primary"
        />
        Fence is on
      </label>

      {showProblems && problems.length > 0 && (
        <ul role="alert" className="space-y-0.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || recorder.state === 'recording'}
          className="rounded bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : existing ? 'Save changes' : 'Create fence'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-800">
          Cancel
        </button>
      </div>

      {draft.validPeriods.length > 0 && (
        <p className="text-[11px] text-slate-400">
          Active {draft.validPeriods.map(describePeriod).join(', ')}.
        </p>
      )}
    </div>
  )
}
