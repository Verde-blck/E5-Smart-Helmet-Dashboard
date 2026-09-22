import { useQuery } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { qk } from '@/shared/lib/query-keys'
import { fetchTrackSamples } from '../api/track.api'
import { buildTrack } from '../lib/track'
import type { Track } from '../types'

export function useTrack(deviceId: string | null, from: number, to: number, enabled: boolean) {
  const tenantId = useTenantId()

  const { data, isFetching, isError } = useQuery({
    queryKey: [...qk.devices.detail(tenantId, deviceId ?? ''), 'track', from, to] as const,
    queryFn: async (): Promise<Track> => {
      const { samples, truncated } = await fetchTrackSamples(deviceId as string, from, to)
      return buildTrack(deviceId as string, samples, from, to, truncated)
    },
    // Only runs when the operator asks for it: a range change shouldn't fire
    // a request until they press View.
    enabled: enabled && !!deviceId,
    staleTime: 5 * 60_000,
  })

  return { track: data ?? null, isFetching, isError }
}
