import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { num, pageContent, shortDeviceName, ts } from '@/shared/lib/api-normalize'
import type { Page } from '@/shared/lib/api-normalize'
import { fetchDevices } from '@/modules/devices/api/devices.api'
import { deleteMockMedia, getMockMedia, getMockMediaUrl } from './media.mock'
import { dayBounds } from '../types'
import type { MediaItem, MediaQuery, SignedMediaUrl } from '../types'

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
    fileName: url || undefined,
    lat: num(api.latitude),
    lng: num(api.longitude),
  }
}

export async function fetchMedia(query: MediaQuery = {}): Promise<MediaItem[]> {
  if (env.useMocks) return getMockMedia(query)

  // There is no recordings endpoint at all — the commands start and stop
  // recording on the helmet, but nothing retrieves the files. Video Record
  // stays empty until the backend exposes one.
  if (query.kind === 'video') return []

  // Photos are only available per device; there's no fleet-wide endpoint, so
  // "all devices" fans out. Fine at this fleet size, worth an endpoint later.
  const deviceIds = query.deviceId
    ? [query.deviceId]
    : (await fetchDevices()).map((d) => d.id)

  const pages = await Promise.all(
    deviceIds.map((id) =>
      apiClient
        .get<Page<ApiPhoto>>(`/devices/${id}/photos`, { params: { page: 0, size: 100 } })
        .then((res) => pageContent(res.data).map(toPhoto))
        .catch(() => [] as MediaItem[])
    )
  )

  let items = pages.flat()

  if (query.date) {
    const { from, to } = dayBounds(query.date)
    items = items.filter((m) => m.capturedAt >= from && m.capturedAt <= to)
  }
  if (query.search) {
    const needle = query.search.trim().toLowerCase()
    items = items.filter((m) => m.fileName?.toLowerCase().includes(needle))
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
 */
export async function fetchMediaUrl(id: string): Promise<SignedMediaUrl> {
  if (env.useMocks) return getMockMediaUrl(id)
  const { data } = await apiClient.get<SignedMediaUrl>(`/media/${id}/url`)
  return data
}

export async function deleteMedia(id: string): Promise<void> {
  if (env.useMocks) return deleteMockMedia(id)
  await apiClient.delete(`/media/${id}`)
}
