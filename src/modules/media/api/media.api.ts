import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { deleteMockMedia, getMockMedia, getMockMediaUrl } from './media.mock'
import { dayBounds } from '../types'
import type { MediaItem, MediaQuery, SignedMediaUrl } from '../types'

export async function fetchMedia(query: MediaQuery = {}): Promise<MediaItem[]> {
  if (env.useMocks) return getMockMedia(query)

  // The date is expanded into an epoch range here rather than sent as a
  // calendar day, so the server never has to guess the client's timezone.
  const range = query.date ? dayBounds(query.date) : undefined

  const { data } = await apiClient.get<MediaItem[]>('/media', {
    params: {
      kind: query.kind,
      deviceId: query.deviceId,
      from: range?.from,
      to: range?.to,
      search: query.search || undefined,
    },
  })
  return data
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
