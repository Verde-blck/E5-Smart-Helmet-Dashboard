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

// Presence is resolved here against a ticking clock so every consumer agrees.

export function useDevices() {
  const tenantId = useTenantId()
  const now = useNow()
  const { inScope } = useSiteScope()
  const { data, dataUpdatedAt, isLoading, isError, refetch } = useQuery({
    queryKey: qk.devices.all(tenantId),
    queryFn: fetchDevices,
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

  const outOfScope = !!data && !inScope(data.site)

  return { device: outOfScope ? null : device, outOfScope, now, isLoading, isError }
}

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

export function useDeviceNames() {
  const { devices } = useDevices()
  return useMemo(() => {
    const names = new Map(devices.map((d) => [d.id, d.named === false ? null : d.name]))
    return (deviceId: string, fallback?: string): string =>
      names.get(deviceId) ?? fallback ?? (deviceId.length > 5 ? `…${deviceId.slice(-5)}` : deviceId)
  }, [devices])
}

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
