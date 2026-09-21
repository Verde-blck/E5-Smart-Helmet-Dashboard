import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { useNow } from '@/shared/hooks/useNow'
import { features } from '@/config/features'
import { useSiteScope } from '@/shared/hooks/useSiteScope'
import { qk } from '@/shared/lib/query-keys'
import {
  fetchDevice,
  fetchDevices,
  fetchFleetSummary,
  registerDevice,
  setDeviceActive,
} from '../api/devices.api'
import { toDeviceView } from '../lib/presence'
import type { DeviceView } from '../types'

// These hooks return DeviceView, not Device: presence is resolved here against
// a ticking clock so every consumer sees the same answer and none of them have
// to remember to recompute it.

export function useDevices() {
  const tenantId = useTenantId()
  const now = useNow()
  const { inScope } = useSiteScope()
  const { data, dataUpdatedAt, isLoading, isError, refetch } = useQuery({
    queryKey: qk.devices.all(tenantId),
    queryFn: fetchDevices,
    // Polling stands in for push: the backend's WebSocket is for helmets, not
    // for the dashboard. See config/features.ts.
    refetchInterval: features.realtimeSocket ? false : features.pollIntervalMs,
  })

  const devices = useMemo<DeviceView[]>(
    () => (data ?? []).filter((d) => inScope(d.site)).map((d) => toDeviceView(d, now)),
    [data, now, inScope]
  )

  return { devices, now, dataUpdatedAt, isLoading, isError, refetch }
}

export function useDevice(id: string) {
  const tenantId = useTenantId()
  const now = useNow()
  const { inScope } = useSiteScope()
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.devices.detail(tenantId, id),
    queryFn: () => fetchDevice(id),
    enabled: !!id,
    refetchInterval: features.realtimeSocket ? false : features.pollIntervalMs,
  })

  const device = useMemo<DeviceView | null>(
    () => (data ? toDeviceView(data, now) : null),
    [data, now]
  )

  // Reached by a pasted or bookmarked link to a helmet at another site. The
  // server should 404 it; this keeps the UI honest if it doesn't.
  const outOfScope = !!data && !inScope(data.site)

  return { device: outOfScope ? null : device, outOfScope, now, isLoading, isError }
}

/**
 * Activate or deactivate a helmet — a registration state an administrator
 * controls, not something the device reports. Both the fleet list and the
 * detail view are refreshed, since either may be on screen.
 */
export function useSetDeviceActive() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setDeviceActive(id, active),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: qk.devices.all(tenantId) })
      void queryClient.invalidateQueries({ queryKey: qk.devices.detail(tenantId, id) })
    },
  })
}

/**
 * Fleet totals straight from the backend.
 *
 * Deliberately a separate query from the device list: the counts must stay
 * correct even if /devices is ever paginated, and the server is the authority
 * on what "online" means.
 */
export function useFleetSummary() {
  const tenantId = useTenantId()
  const { data, isLoading, isError } = useQuery({
    queryKey: [...qk.devices.all(tenantId), 'summary'] as const,
    queryFn: fetchFleetSummary,
    refetchInterval: features.realtimeSocket ? false : features.pollIntervalMs,
  })

  return { summary: data ?? null, isLoading, isError }
}

export function useRegisterDevice() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()

  return useMutation({
    mutationFn: (deviceId: string) => registerDevice(deviceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.devices.all(tenantId) })
    },
  })
}
