import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { qk } from '@/shared/lib/query-keys'
import { deleteMedia, fetchMedia, fetchMediaUrl } from '../api/media.api'
import type { MediaItem } from '../types'

/**
 * Signed URLs are issued with a 15-minute TTL. Cache them for ten so React
 * Query re-issues while the old one is still valid, instead of handing an
 * expired URL to a <video> element mid-scrub.
 */
const SIGNED_URL_CACHE_MS = 10 * 60_000

export function useMediaList(deviceId?: string) {
  const tenantId = useTenantId()
  const { data, isLoading, isError } = useQuery({
    queryKey: deviceId ? qk.media.byDevice(tenantId, deviceId) : qk.media.all(tenantId),
    queryFn: () => fetchMedia(deviceId),
  })

  return { media: data ?? [], isLoading, isError }
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

export function useDeleteMedia(deviceId?: string) {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  const key = deviceId ? qk.media.byDevice(tenantId, deviceId) : qk.media.all(tenantId)

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
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: qk.media.all(tenantId) })
    },
  })
}