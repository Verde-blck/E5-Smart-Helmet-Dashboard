import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTenantId } from '@/shared/hooks/useTenant'
import { useSiteScope } from '@/shared/hooks/useSiteScope'
import { qk } from '@/shared/lib/query-keys'
import { useDeviceNames } from '@/modules/devices/hooks/useDevices'
import { deleteMedia, fetchMedia, fetchMediaUrl, fetchVideoCalendar } from '../api/media.api'
import type { MediaItem, MediaQuery } from '../types'

// Re-issued well before the signed URL lapses, so a <video> never gets an expired link mid-scrub.
const SIGNED_URL_CACHE_MS = 10 * 60_000

export function useMediaList(query: MediaQuery = {}) {
  const tenantId = useTenantId()
  const { inScope } = useSiteScope()
  const nameOf = useDeviceNames()

  // Search isn't in the key: it runs after names are filled in, and typing doesn't refetch.
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
    placeholderData: (previous) => previous,
    // Links expire after an hour; refetch well inside that.
    staleTime: 20 * 60_000,
    refetchInterval: 40 * 60_000,
    gcTime: 45 * 60_000,
  })

  const needle = query.search?.trim().toLowerCase() ?? ''
  const media = useMemo(() => {
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
      void queryClient.invalidateQueries({ queryKey: qk.media.all(tenantId) })
    },
  })
}
export function useVideoCalendar(month: string, deviceId?: string) {
  const tenantId = useTenantId()
  return useQuery({
    queryKey: qk.media.calendar(tenantId, deviceId ?? null, month),
    queryFn: () => fetchVideoCalendar(month, deviceId),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  })
}
