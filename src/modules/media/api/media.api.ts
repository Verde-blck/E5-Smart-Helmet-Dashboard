import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { num, pageContent, shortDeviceName, ts } from '@/shared/lib/api-normalize'
import type { Page } from '@/shared/lib/api-normalize'
import { fetchDevices } from '@/modules/devices/api/devices.api'
import { deleteMockMedia, getMockMedia, getMockMediaUrl } from './media.mock'
import { dayBounds } from '../types'
import type { MediaItem, MediaKind, MediaQuery, SignedMediaUrl } from '../types'

// --- Photos -------------------------------------------------------------

interface ApiPhoto {
  id: number
  deviceId: string
  imageUrl?: string | null
  latitude?: string | null
  longitude?: string | null
  capturedAt?: string | null
}

function toPhoto(api: ApiPhoto): MediaItem {
  // The backend currently stores a placeholder string where the URL will go,
  // so anything that isn't an absolute URL is treated as "not uploaded yet"
  // rather than rendered as a broken image.
  const url = api.imageUrl ?? ''
  const uploaded = /^https?:\/\//i.test(url)

  return {
    id: String(api.id),
    deviceId: api.deviceId,
    deviceName: shortDeviceName(api.deviceId),
    kind: 'photo',
    status: uploaded ? 'available' : 'uploading',
    capturedAt: ts(api.capturedAt) ?? 0,
    thumbnailUrl: uploaded ? url : undefined,
    url: uploaded ? url : undefined,
    fileName: url || undefined,
    lat: num(api.latitude),
    lng: num(api.longitude),
  }
}

// --- Videos -------------------------------------------------------------

interface ApiVideo {
  id: number
  deviceId: string
  videoUrl?: string | null
  fileName?: string | null
  fileSizeBytes?: number | string | null
  uploadedAt?: string | null
}

/**
 * The helmet names each clip after the moment recording started, on its own
 * clock: "20260831130152.mp4" is 31 Aug 2026, 13:01:52. That's the capture
 * time, which can be days before uploadedAt if the helmet was out of signal.
 * Read as local time, since the helmet has no timezone in the name.
 */
function recordedAtFromFileName(fileName?: string | null): number | undefined {
  const m = fileName?.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
  if (!m) return undefined
  const [, y, mo, d, h, mi, s] = m.map(Number)
  const date = new Date(y, mo - 1, d, h, mi, s)
  return Number.isNaN(date.getTime()) ? undefined : date.getTime()
}

function toVideo(api: ApiVideo): MediaItem {
  const uploadedAt = ts(api.uploadedAt)
  const url = api.videoUrl ?? ''
  return {
    // Prefixed: video and photo ids come from different tables, and both
    // kinds share one list on the device page.
    id: `v${api.id}`,
    deviceId: api.deviceId,
    deviceName: shortDeviceName(api.deviceId),
    kind: 'video',
    // Rows only exist once the upload has finished.
    status: /^https?:\/\//i.test(url) ? 'available' : 'failed',
    capturedAt: recordedAtFromFileName(api.fileName) ?? uploadedAt ?? 0,
    uploadedAt,
    sizeBytes: num(api.fileSizeBytes),
    fileName: api.fileName ?? undefined,
    url: url || undefined,
  }
}

// --- Listing ------------------------------------------------------------

/** Pages are 20 by default; a helmet with a busy week can have hundreds. */
const PAGE_SIZE = 100
const MAX_PAGES = 5

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const items: T[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await apiClient.get<Page<T>>(path, { params: { page, size: PAGE_SIZE } })
    items.push(...pageContent(data))
    if (!data || Array.isArray(data) || data.last !== false) break
  }
  return items
}

const ENDPOINT: Record<MediaKind, { path: string; map: (raw: never) => MediaItem }> = {
  photo: { path: 'photos', map: toPhoto as (raw: never) => MediaItem },
  video: { path: 'videos', map: toVideo as (raw: never) => MediaItem },
}

export async function fetchMedia(query: MediaQuery = {}): Promise<MediaItem[]> {
  if (env.useMocks) return getMockMedia(query)

  // Both endpoints are per device; there's no fleet-wide list, so "all
  // devices" fans out one request per helmet. Fine at this fleet size;
  // worth a GET /api/videos (and /photos) once the fleet grows.
  const deviceIds = query.deviceId
    ? [query.deviceId]
    : (await fetchDevices()).map((d) => d.id)
  const kinds: MediaKind[] = query.kind ? [query.kind] : ['photo', 'video']

  const lists = await Promise.all(
    deviceIds.flatMap((id) =>
      kinds.map((kind) =>
        fetchAllPages<never>(`/devices/${id}/${ENDPOINT[kind].path}`)
          .then((rows) => rows.map(ENDPOINT[kind].map))
          // One helmet failing shouldn't blank the whole gallery.
          .catch(() => [] as MediaItem[])
      )
    )
  )

  let items = lists.flat()

  if (query.date) {
    const { from, to } = dayBounds(query.date)
    items = items.filter((m) => m.capturedAt >= from && m.capturedAt <= to)
  }
  if (query.search) {
    const needle = query.search.trim().toLowerCase()
    items = items.filter(
      (m) =>
        m.fileName?.toLowerCase().includes(needle) ||
        m.deviceName.toLowerCase().includes(needle) ||
        m.deviceId.includes(needle)
    )
  }

  return items.sort((a, b) => b.capturedAt - a.capturedAt)
}

/**
 * The storage contract in one function.
 *
 * The browser never holds object-storage credentials and never receives a
 * permanent URL. It asks the backend for a short-lived signed GET at the
 * moment of playback; the backend checks that the object key's tenant prefix
 * matches the caller's session claim before signing. A leaked URL expires on
 * its own, which is the only revocation path you get with object storage.
 *
 * Not used for items that already carry a direct `url` — which today is
 * every live photo and video, since the backend serves public R2 links.
 */
export async function fetchMediaUrl(id: string): Promise<SignedMediaUrl> {
  if (env.useMocks) return getMockMediaUrl(id)
  const { data } = await apiClient.get<SignedMediaUrl>(`/media/${id}/url`)
  return data
}

/**
 * Whether the backend can delete this kind of item. There's no delete
 * endpoint for videos, so the button is hidden rather than left to fail.
 */
export function canDeleteMedia(kind: MediaKind): boolean {
  return env.useMocks || kind === 'photo'
}

export async function deleteMedia(id: string): Promise<void> {
  if (env.useMocks) return deleteMockMedia(id)
  await apiClient.delete(`/media/${id}`)
}
