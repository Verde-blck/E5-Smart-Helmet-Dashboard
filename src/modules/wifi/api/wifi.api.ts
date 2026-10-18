import { apiClient } from '@/shared/lib/api-client'
import { env } from '@/config/env'
import { ts } from '@/shared/lib/api-normalize'

/*
 * Helmet Wi-Fi (replaces the Anlink app). From the guide of 14 Oct 2026.
 *
 * POST /api/devices/{id}/wifi/scan     → { delivered }   false = offline
 * GET  /api/devices/{id}/wifi          → { scannedAt, networks[] }
 * POST /api/devices/{id}/wifi/connect  ← { ssid, password }
 *
 * Not queued: an offline helmet simply doesn't get the command. Not yet
 * tested on a real helmet.
 */

export interface WifiNetwork {
  ssid: string
  /** 0 (weak) to 4 (strong). */
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

// --- Mock ---------------------------------------------------------------
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
    // The helmet reports a few seconds later, as the real one does.
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
  // Some endpoints answer an empty 200; treat that as accepted.
  return { delivered: data?.delivered !== false }
}

/**
 * Asks the helmet to scan, then waits for a report newer than the one before.
 * Polls every 2 s, as the guide suggests, and gives up after 30 s.
 */
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

// --- Site Wi-Fi: one network every helmet gets at start-up --------------

export interface SiteWifi {
  ssid: string | null
  /** The password is never returned, only whether one is stored. */
  passwordSet: boolean
}

let mockSite: SiteWifi = { ssid: 'E5ENERGY', passwordSet: true }

/** GET /api/settings/site-wifi. 404 or an empty body means none is set. */
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

/** Leave `password` undefined to keep the current one. */
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

// --- Switching a helmet to mobile data ----------------------------------

export type MobileSwitchResult =
  | { status: 'sent'; delivered: boolean }
  /** The helmet hasn't reported a SIM; retry with force to send anyway. */
  | { status: 'no-sim'; message: string }

/**
 * POST /api/devices/{id}/network/mobile: the helmet drops Wi-Fi and
 * reconnects over 4G. If its SIM has no data it stays offline until it's
 * back on a known Wi-Fi, so the UI always confirms first. Not yet tested
 * with a live SIM.
 */
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
