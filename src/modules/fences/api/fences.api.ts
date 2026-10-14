import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { num } from '@/shared/lib/api-normalize'
import type { Fence, FenceBehavior, FenceDraft, FenceFrequency, FenceShape, LatLng } from '../types'

/*
 * GET    /api/fences                     all fences
 * POST   /api/fences                     create   (body: the draft)
 * PUT    /api/fences/{id}                update   (same body)
 * DELETE /api/fences/{id}
 * POST   /api/fences/{id}/warning-audio  multipart `file`, max 5 MB
 * DELETE /api/fences/{id}/warning-audio
 *
 * Invalid input is a 400 with {"error": "..."}; the message is shown as-is,
 * since the backend knows its own rules best.
 */

type ApiFence = Record<string, unknown>

function toLatLng(raw: unknown): LatLng | null {
  const o = raw as { lat?: unknown; lng?: unknown } | null
  const lat = num(o?.lat as string | number | null | undefined)
  const lng = num(o?.lng as string | number | null | undefined)
  return lat != null && lng != null ? { lat, lng } : null
}

function toFence(api: ApiFence): Fence {
  const freq = Number(api.frequencyMinutes)
  return {
    id: Number(api.id),
    name: String(api.name ?? ''),
    type: (api.type === 'POLYGON' ? 'POLYGON' : 'ROUND') as FenceShape,
    center: toLatLng(api.center),
    radiusMeters: num(api.radiusMeters as number | string | null) ?? 0,
    points: Array.isArray(api.points)
      ? (api.points.map(toLatLng).filter(Boolean) as LatLng[])
      : [],
    behavior: (api.behavior === 'NO_ENTRY' ? 'NO_ENTRY' : 'FORBIDDEN_TO_LEAVE') as FenceBehavior,
    frequencyMinutes: ([0, 5, 10, 15, 20].includes(freq) ? freq : 0) as FenceFrequency,
    validPeriods: Array.isArray(api.validPeriods)
      ? (api.validPeriods as { start?: string; end?: string }[]).map((p) => ({
          start: String(p.start ?? '').slice(0, 5),
          end: String(p.end ?? '').slice(0, 5),
        }))
      : [],
    deviceIds: Array.isArray(api.deviceIds) ? (api.deviceIds as unknown[]).map(String) : [],
    active: api.active !== false,
    // The guide doesn't name this field; accept the likely spellings.
    hasWarningAudio: Boolean(
      api.hasWarningAudio ?? api.warningAudioUrl ?? api.warningAudio ?? api.warningAudioKey
    ),
  }
}

/** The body for POST and PUT: only what the guide lists, shape-specific. */
function toBody(draft: FenceDraft) {
  return {
    name: draft.name.trim(),
    type: draft.type,
    ...(draft.type === 'ROUND'
      ? { center: draft.center, radiusMeters: Math.round(draft.radiusMeters) }
      : { points: draft.points }),
    behavior: draft.behavior,
    frequencyMinutes: draft.frequencyMinutes,
    validPeriods: draft.validPeriods,
    deviceIds: draft.deviceIds,
    active: draft.active,
  }
}

/** The backend's own explanation from a 400, if there is one. */
export function fenceErrorMessage(error: unknown): string {
  const data = (error as { response?: { status?: number; data?: { error?: string } } })?.response
  if (data?.data?.error) return data.data.error
  if (data?.status === 413) return 'That clip is too large. The limit is 5 MB.'
  return 'Couldn’t save the fence. Check your connection and try again.'
}

// --- Mock store ---------------------------------------------------------

let mockId = 3
const mockFences: Fence[] = [
  {
    id: 1,
    name: 'Site A work area',
    type: 'ROUND',
    center: { lat: 6.5244, lng: 3.3792 },
    radiusMeters: 400,
    points: [],
    behavior: 'FORBIDDEN_TO_LEAVE',
    frequencyMinutes: 5,
    validPeriods: [{ start: '08:00', end: '17:00' }],
    deviceIds: [],
    active: true,
    hasWarningAudio: true,
  },
  {
    id: 2,
    name: 'Transformer yard',
    type: 'POLYGON',
    center: null,
    radiusMeters: 0,
    points: [
      { lat: 6.5285, lng: 3.3735 },
      { lat: 6.5292, lng: 3.3762 },
      { lat: 6.5271, lng: 3.3768 },
      { lat: 6.5266, lng: 3.3741 },
    ],
    behavior: 'NO_ENTRY',
    frequencyMinutes: 0,
    validPeriods: [],
    deviceIds: [],
    active: true,
    hasWarningAudio: false,
  },
]
const delay = () => new Promise((resolve) => setTimeout(resolve, 300))

// --- Public API ---------------------------------------------------------

export async function fetchFences(): Promise<Fence[]> {
  if (env.useMocks) {
    await delay()
    return mockFences.map((f) => ({ ...f }))
  }
  const { data } = await apiClient.get<ApiFence[] | { content?: ApiFence[] }>('/fences')
  const rows = Array.isArray(data) ? data : (data?.content ?? [])
  return rows.map(toFence)
}

export async function saveFence(draft: FenceDraft, id?: number): Promise<Fence> {
  if (env.useMocks) {
    await delay()
    const saved: Fence = {
      ...draft,
      id: id ?? mockId++,
      hasWarningAudio: mockFences.find((f) => f.id === id)?.hasWarningAudio ?? false,
    }
    const i = mockFences.findIndex((f) => f.id === saved.id)
    if (i >= 0) mockFences[i] = saved
    else mockFences.push(saved)
    return { ...saved }
  }
  const { data } = id
    ? await apiClient.put<ApiFence>(`/fences/${id}`, toBody(draft))
    : await apiClient.post<ApiFence>('/fences', toBody(draft))
  return toFence(data)
}

export async function deleteFence(id: number): Promise<void> {
  if (env.useMocks) {
    await delay()
    const i = mockFences.findIndex((f) => f.id === id)
    if (i >= 0) mockFences.splice(i, 1)
    return
  }
  await apiClient.delete(`/fences/${id}`)
}

/** The clip the helmet plays on a breach, e.g. "You have left the work area". */
export async function uploadWarningAudio(id: number, clip: Blob): Promise<void> {
  if (env.useMocks) {
    await delay()
    const f = mockFences.find((x) => x.id === id)
    if (f) f.hasWarningAudio = true
    return
  }
  const form = new FormData()
  const mp3 = clip.type === 'audio/mpeg'
  form.append(
    'file',
    clip instanceof File
      ? clip
      : new File([clip], `fence-${id}-warning.${mp3 ? 'mp3' : 'wav'}`, {
          type: mp3 ? 'audio/mpeg' : clip.type || 'audio/wav',
        })
  )
  await apiClient.post(`/fences/${id}/warning-audio`, form)
}

export async function removeWarningAudio(id: number): Promise<void> {
  if (env.useMocks) {
    const f = mockFences.find((x) => x.id === id)
    if (f) f.hasWarningAudio = false
    return
  }
  await apiClient.delete(`/fences/${id}/warning-audio`)
}

export const WARNING_AUDIO_MAX_BYTES = 5 * 1024 * 1024
