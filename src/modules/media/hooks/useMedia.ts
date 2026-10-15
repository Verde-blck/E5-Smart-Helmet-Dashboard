import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTenantId } from '@/shared/hooks/useTenant'
import { useSiteScope } from '@/shared/hooks/useSiteScope'
import { qk } from '@/shared/lib/query-keys'
import { useDeviceNames } from '@/modules/devices/hooks/useDevices'
import { deleteMedia, fetchMedia, fetchMediaUrl, fetchVideoCalendar } from '../api/media.api'
import type { MediaItem, MediaQuery } from '../types'

/**
 * Signed URLs are issued with a 15-minute TTL. Cache them for ten so React
 * Query re-issues while the old one is still valid, instead of handing an
 * expired URL to a <video> element mid-scrub.
 */
const SIGNED_URL_CACHE_MS = 10 * 60_000

export function useMediaList(query: MediaQuery = {}) {
  const tenantId = useTenantId()
  const { inScope } = useSiteScope()
  const nameOf = useDeviceNames()

  // Spread into a plain object so the key is stable regardless of how the
  // caller built the query, and so undefined fields don't create variants.
  // Search isn't part of it: it's applied below, after names are filled in,
  // so a helmet's name finds its clips and typing doesn't refetch.
  const key = useMemo(
    () => ({
      kind: query.kind ?? null,
      deviceId: query.deviceId ?? null,
      date: query.date ?? null,
    }),
    [query.kind, query.deviceId, query.date]
  )

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: qk.media.list(tenantId, key),
    queryFn: () => fetchMedia({ kind: query.kind, deviceId: query.deviceId, date: query.date }),
    // Keeps the previous page visible while a new filter loads, rather than
    // flashing an empty grid every time the date changes.
    placeholderData: (previous) => previous,
    // Every photo and video link is signed and dies after an hour. Refetching
    // well inside that keeps the links on screen valid; MediaViewer also
    // refetches early if one fails anyway.
    staleTime: 20 * 60_000,
    refetchInterval: 40 * 60_000,
    gcTime: 45 * 60_000,
  })

  const needle = query.search?.trim().toLowerCase() ?? ''
  const media = useMemo(() => {
    // Photos and videos only carry a deviceId; the name comes from the
    // device list that's already loaded.
    const named = (data ?? [])
      .filter((m) => inScope(m.site))
      .map((m) => ({ ...m, deviceName: nameOf(m.deviceId, m.deviceName) }))
    if (!needle) return named
    return named.filter(
      (m) =>
        m.deviceName.toLowerCase().includes(needle) ||
        m.deviceId.includes(needle) ||
        (m.fileName?.toLowerCase().includes(needle) ?? false)
    )
  }, [data, inScope, nameOf, needle])

  return { media, isLoading, isFetching, isError, cacheKey: key }
}

export function useMediaUrl(id: string | null) {
  const tenantId = useTenantId()
  return useQuery({
    queryKey: qk.media.url(tenantId, id ?? ''),
    queryFn: () => fetchMediaUrl(id as string),
    enabled: !!id,
    staleTime: SIGNED_URL_CACHE_MS,
    gcTime: SIGNED_URL_CACHE_MS + 60_000,
    retry: 1,
  })
}

export function useDeleteMedia(cacheKey: Record<string, unknown>) {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  const key = qk.media.list(tenantId, cacheKey)

  return useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<MediaItem[]>(key)
      queryClient.setQueryData<MediaItem[]>(key, (prev) => prev?.filter((m) => m.id !== id))
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      // Every filtered list, since a deleted item may appear in several.
      void queryClient.invalidateQueries({ queryKey: qk.media.all(tenantId) })
    },
  })
}
/** Days with recordings in a month, for the Video Record calendar. */
export function useVideoCalendar(month: string, deviceId?: string) {
  const tenantId = useTenantId()
  return useQuery({
    queryKey: qk.media.calendar(tenantId, deviceId ?? null, month),
    queryFn: () => fetchVideoCalendar(month, deviceId),
    // Keeps the old month's dots while the next month loads.
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  })
}
