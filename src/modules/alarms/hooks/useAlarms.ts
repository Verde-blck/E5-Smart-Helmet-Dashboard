import { useMemo, useSyncExternalStore } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { useNow } from '@/shared/hooks/useNow'
import { useAuth } from '@/shared/hooks/useAuth'
import { useSiteScope } from '@/shared/hooks/useSiteScope'
import { features } from '@/config/features'
import { qk } from '@/shared/lib/query-keys'
import { fetchAlarms, setAlarmResolved } from '../api/alarms.api'
import type { Alarm } from '../types'
import { streamStatus } from '../lib/alarmStream'

export function useAlarms() {
  const tenantId = useTenantId()
  const now = useNow()
  const { inScope } = useSiteScope()

  const streaming = useSyncExternalStore(streamStatus.subscribe, streamStatus.get)

  const { data, isLoading, isError } = useQuery({
    queryKey: qk.alarms.all(tenantId),
    queryFn: fetchAlarms,
    // New alarms arrive instantly over the stream (see LiveAlarms). While it's
    // up, polling is only a slow safety net; while it's down, it's the only
    // way alarms arrive, so it goes back to the normal interval.
    refetchInterval: streaming ? 120_000 : features.pollIntervalMs,
  })

  // Newest first, unresolved always above history — an operator opening this
  // page during an incident should not have to scroll to find the live event.
  const alarms = useMemo(() => {
    const list = (data ?? []).filter((a) => inScope(a.site))
    return [...list].sort((a, b) => {
      const activeDelta = Number(b.status === 'active') - Number(a.status === 'active')
      return activeDelta !== 0 ? activeDelta : b.raisedAt - a.raisedAt
    })
  }, [data, inScope])

  const active = useMemo(() => alarms.filter((a) => a.status === 'active'), [alarms])

  return { alarms, active, now, isLoading, isError }
}

export function useResolveAlarm() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
      setAlarmResolved(id, resolved, user?.name ?? 'Unknown'),
    onMutate: async ({ id, resolved }) => {
      // Optimistic: a resolve that takes a round-trip to grey out feels broken
      // during an incident, which is exactly when it gets used.
      const key = qk.alarms.all(tenantId)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Alarm[]>(key)

      queryClient.setQueryData<Alarm[]>(key, (prev) =>
        prev?.map((a): Alarm =>
          a.id === id
            ? {
                ...a,
                status: resolved ? 'resolved' : 'active',
                resolvedAt: resolved ? Date.now() : undefined,
                resolvedBy: resolved ? user?.name : undefined,
              }
            : a
        )
      )

      return { previous, key }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous)
    },
    onSettled: (_data, _err, _vars, context) => {
      if (context?.key) void queryClient.invalidateQueries({ queryKey: context.key })
    },
  })
}
