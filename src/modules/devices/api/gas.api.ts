import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { num } from '@/shared/lib/api-normalize'

export interface GasLiveness {
  online: boolean
  // Seconds since the readings were taken; null when the helmet never reported gas.
  ageSeconds: number | null
  live: boolean
}

export async function fetchGasLiveness(deviceId: string): Promise<GasLiveness | null> {
  if (env.useMocks) return null
  const { data } = await apiClient.get<{ online?: boolean; ageSeconds?: number | string | null; live?: boolean }>(
    `/devices/${deviceId}/gas`
  )
  if (typeof data?.live !== 'boolean') return null
  return { online: data.online === true, ageSeconds: num(data.ageSeconds) ?? null, live: data.live }
}

// "less than a minute", "5 min", "3 h", "2 days"
export function formatAge(seconds: number): string {
  if (seconds < 60) return 'less than a minute'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h`
  return `${Math.round(hours / 24)} days`
}
