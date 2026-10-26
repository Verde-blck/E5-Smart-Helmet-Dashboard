import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { ts } from '@/shared/lib/api-normalize'

export interface WifiNetwork {
  ssid: string
  signal: number
  connected: boolean
}

export interface WifiScan {
  scannedAt: number | null
  networks: WifiNetwork[]
}

interface ApiWifi {
  scannedAt?: string | null
  networks?: { ssid?: string; signal?: number | string; connected?: boolean }[]
}

function toScan(data: ApiWifi | null | undefined): WifiScan {
  return {
    scannedAt: ts(data?.scannedAt) ?? null,
    networks: (data?.networks ?? [])
      .filter((n) => n.ssid)
      .map((n) => ({
        ssid: String(n.ssid),
        signal: Math.max(0, Math.min(4, Number(n.signal) || 0)),
        connected: n.connected === true,
      })),
  }
}

let mockScan: WifiScan = { scannedAt: null, networks: [] }
let mockConnected = 'E5-Setup'
const MOCK_NETWORKS = [
  { ssid: 'Office WiFi', signal: 4 },
  { ssid: 'E5-Setup', signal: 3 },
  { ssid: 'Site Container', signal: 2 },
  { ssid: 'MTN_4G_Router', signal: 1 },
]

export async function scanWifi(deviceId: string): Promise<{ delivered: boolean }> {
  if (env.useMocks) {
    setTimeout(() => {
      mockScan = {
        scannedAt: Date.now(),
        networks: MOCK_NETWORKS.map((n) => ({ ...n, connected: n.ssid === mockConnected })),
      }
    }, 2500)
    return { delivered: true }
  }
  const { data } = await apiClient.post<{ delivered?: boolean }>(`/devices/${deviceId}/wifi/scan`)
  return { delivered: data?.delivered === true }
}

export async function fetchWifi(deviceId: string): Promise<WifiScan> {
  if (env.useMocks) return { ...mockScan, networks: mockScan.networks.map((n) => ({ ...n })) }
  const { data } = await apiClient.get<ApiWifi>(`/devices/${deviceId}/wifi`)
  return toScan(data)
}

export async function connectWifi(
  deviceId: string,
  ssid: string,
  password: string
): Promise<{ delivered: boolean }> {
  if (env.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    mockConnected = ssid
    return { delivered: true }
  }
  const { data } = await apiClient.post<{ delivered?: boolean }>(
    `/devices/${deviceId}/wifi/connect`,
    { ssid, password }
  )
  return { delivered: data?.delivered !== false }
}

export async function scanAndWait(
  deviceId: string,
  signal: AbortSignal
): Promise<{ delivered: boolean; scan: WifiScan | null }> {
  const before = (await fetchWifi(deviceId).catch(() => null))?.scannedAt ?? null
  const { delivered } = await scanWifi(deviceId)
  if (!delivered) return { delivered, scan: null }

  const giveUpAt = Date.now() + 30_000
  while (!signal.aborted && Date.now() < giveUpAt) {
    await new Promise((resolve) => setTimeout(resolve, 2_000))
    if (signal.aborted) break
    const scan = await fetchWifi(deviceId).catch(() => null)
    if (scan?.scannedAt && scan.scannedAt !== before) return { delivered, scan }
  }
  return { delivered, scan: null }
}

export interface SiteWifi {
  ssid: string | null
  passwordSet: boolean
}

let mockSite: SiteWifi = { ssid: 'E5ENERGY', passwordSet: true }

export async function fetchSiteWifi(): Promise<SiteWifi> {
  if (env.useMocks) return { ...mockSite }
  try {
    const { data } = await apiClient.get<Partial<SiteWifi> | null>('/settings/site-wifi')
    return { ssid: data?.ssid || null, passwordSet: data?.passwordSet === true }
  } catch (error) {
    if ((error as { response?: { status?: number } })?.response?.status === 404) {
      return { ssid: null, passwordSet: false }
    }
    throw error
  }
}

export async function saveSiteWifi(ssid: string, password?: string): Promise<SiteWifi> {
  if (env.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    mockSite = { ssid, passwordSet: password ? true : mockSite.passwordSet }
    return { ...mockSite }
  }
  const { data } = await apiClient.put<SiteWifi>('/settings/site-wifi', {
    ssid,
    ...(password ? { password } : {}),
  })
  return { ssid: data?.ssid ?? ssid, passwordSet: data?.passwordSet === true }
}

export async function removeSiteWifi(): Promise<void> {
  if (env.useMocks) {
    mockSite = { ssid: null, passwordSet: false }
    return
  }
  await apiClient.delete('/settings/site-wifi')
}

export type MobileSwitchResult =
  | { status: 'sent'; delivered: boolean }
  /** The helmet hasn't reported a SIM; retry with force to send anyway. */
  | { status: 'no-sim'; message: string }

export async function switchToMobileData(deviceId: string, force = false): Promise<MobileSwitchResult> {
  if (env.useMocks) {
    await new Promise((resolve) => setTimeout(resolve, 400))
    return force || deviceId.endsWith('0')
      ? { status: 'sent', delivered: true }
      : { status: 'no-sim', message: 'The helmet has not reported a SIM card.' }
  }
  try {
    const { data } = await apiClient.post<{ delivered?: boolean }>(
      `/devices/${deviceId}/network/mobile`,
      null,
      force ? { params: { force: true } } : undefined
    )
    return { status: 'sent', delivered: data?.delivered !== false }
  } catch (error) {
    const res = (error as { response?: { status?: number; data?: { error?: string; message?: string } } })?.response
    if (res?.status === 409 && res.data?.error === 'no_sim') {
      return { status: 'no-sim', message: res.data.message ?? 'The helmet has not reported a SIM card.' }
    }
    throw error
  }
}
