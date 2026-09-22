import { useQuery } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { qk } from '@/shared/lib/query-keys'
import { fetchTrackSamples } from '../api/track.api'
import { buildTrack } from '../lib/track'
import { buildAvailability } from '../lib/availability'
import type { AvailabilitySummary } from '../lib/availability'
import type { Track } from '../types'

export function useTrack(deviceId: string | null, from: number, to: number, enabled: boolean) {
  const tenantId = useTenantId()

  const { data, isFetching, isError } = useQuery({
    queryKey: [...qk.devices.detail(tenantId, deviceId ?? ''), 'track', from, to] as const,
    queryFn: async (): Promise<{ track: Track; availability: AvailabilitySummary }> => {
      const { samples, truncated } = await fetchTrackSamples(deviceId as string, from, to)
      return {
        track: buildTrack(deviceId as string, samples, from, to, truncated),
        // Built from the same samples: availability counts every heartbeat,
        // including those with no GPS fix, so it can't be derived from the
        // track's points.
        availability: buildAvailability(samples, from, to),
      }
    },
    // Only runs when the operator asks for it: a range change shouldn't fire
    // a request until they press View.
    enabled: enabled && !!deviceId,
    staleTime: 5 * 60_000,
  })

  return {
    track: data?.track ?? null,
    availability: data?.availability ?? null,
    isFetching,
    isError,
  }
}
