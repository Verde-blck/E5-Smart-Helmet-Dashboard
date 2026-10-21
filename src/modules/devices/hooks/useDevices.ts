import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTenantId } from '@/shared/hooks/useTenant'
import { useNow } from '@/shared/hooks/useNow'
import { features } from '@/config/features'
import { useSiteScope } from '@/shared/hooks/useSiteScope'
import { qk } from '@/shared/lib/query-keys'
import {
  assignWorker,
  clearWorker,
  renameDevice,
  fetchDevice,
  fetchDevices,
  fetchFleetSummary,
  registerDevice,
  setDeviceActive,
} from '../api/devices.api'
import { toDeviceView } from '../lib/presence'
import type { WorkerInput } from '../api/devices.api'
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

/**
 * Registers a helmet, then names it if a name was given. The register call
 * takes only the ID, so naming is a second request; if that one fails, the
 * helmet is still registered and can be named from its page.
 */
export function useRegisterDevice() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()

  return useMutation({
    mutationFn: async ({ deviceId, name }: { deviceId: string; name?: string }) => {
      const device = await registerDevice(deviceId)
      let named = true
      if (name?.trim()) {
        try {
          await renameDevice(device.id, name)
        } catch {
          named = false
        }
      }
      return { device, named }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.devices.all(tenantId) })
    },
  })
}

/** Renames a helmet; every screen showing it updates from the refetch. */
export function useRenameDevice() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()

  return useMutation({
    mutationFn: ({ deviceId, name }: { deviceId: string; name: string }) => renameDevice(deviceId, name),
    onSuccess: (_data, { deviceId }) => {
      void queryClient.invalidateQueries({ queryKey: qk.devices.all(tenantId) })
      void queryClient.invalidateQueries({ queryKey: qk.devices.detail(tenantId, deviceId) })
    },
  })
}

/**
 * Display names for lists that only carry a deviceId (alarms, photos,
 * videos, messages), looked up from the device list that's already loaded.
 * Falls back to whatever name the list had, then the shortened ID.
 */
export function useDeviceNames() {
  const { devices } = useDevices()
  return useMemo(() => {
    const names = new Map(devices.map((d) => [d.id, d.named === false ? null : d.name]))
    return (deviceId: string, fallback?: string): string =>
      names.get(deviceId) ?? fallback ?? (deviceId.length > 5 ? `…${deviceId.slice(-5)}` : deviceId)
  }, [devices])
}

/** Assigns or clears the worker wearing a helmet. */
export function useAssignWorker() {
  const queryClient = useQueryClient()
  const tenantId = useTenantId()
  return useMutation({
    mutationFn: ({ deviceId, worker }: { deviceId: string; worker: WorkerInput | null }) =>
      worker ? assignWorker(deviceId, worker) : clearWorker(deviceId),
    onSuccess: (_data, { deviceId }) => {
      void queryClient.invalidateQueries({ queryKey: qk.devices.all(tenantId) })
      void queryClient.invalidateQueries({ queryKey: qk.devices.detail(tenantId, deviceId) })
    },
  })
}
