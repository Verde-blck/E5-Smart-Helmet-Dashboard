import type { MediaItem, MediaKind, SignedMediaUrl } from '../types'
import { getMockFleet } from '@/modules/devices/api/devices.mock'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const PALETTE = ['#0f766e', '#334155', '#7c2d12', '#1e3a8a', '#4c1d95', '#166534']

/**
 * Deterministic placeholder thumbnail as a data URI, so the gallery has
 * something to render with no network and no binary assets in the repo.
 * Real thumbnails arrive as signed URLs on MediaItem.thumbnailUrl.
 */
function placeholder(seed: number, label: string, kind: MediaKind): string {
  const bg = PALETTE[seed % PALETTE.length]
  const glyph = kind === 'video' ? '▶' : '◉'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">
    <rect width="320" height="180" fill="${bg}"/>
    <rect width="320" height="180" fill="url(#g)" opacity="0.35"/>
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.5"/>
    </linearGradient></defs>
    <text x="160" y="86" font-family="sans-serif" font-size="30" fill="#ffffff" text-anchor="middle" opacity="0.9">${glyph}</text>
    <text x="160" y="116" font-family="sans-serif" font-size="13" fill="#ffffff" text-anchor="middle" opacity="0.75">${label}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const fleet = getMockFleet()

const items: MediaItem[] = Array.from({ length: 26 }, (_, i) => {
  const device = fleet[i % fleet.length]
  const kind: MediaKind = i % 3 === 0 ? 'video' : 'photo'
  const capturedAt = Date.now() - i * 37 * MINUTE - Math.floor(Math.random() * MINUTE)

  // Items 4 and 11 model a helmet that was offline when it captured: the
  // upload lands hours later. Sorting by capture time keeps them in the right
  // place on the timeline even though they only just appeared.
  const uploadLagMs = i === 4 || i === 11 ? 5 * HOUR : 20_000

  return {
    id: `med-${String(i + 1).padStart(3, '0')}`,
    deviceId: device.id,
    deviceName: device.name,
    site: device.site,
    kind,
    status: i === 1 ? 'uploading' : i === 17 ? 'failed' : 'available',
    capturedAt,
    uploadedAt: i === 1 ? undefined : capturedAt + uploadLagMs,
    durationMs: kind === 'video' ? 18_000 + (i % 7) * 11_000 : undefined,
    sizeBytes: kind === 'video' ? 4_200_000 + i * 310_000 : 180_000 + i * 9_000,
    thumbnailUrl: placeholder(i, device.name, kind),
    triggeredBy: i === 0 ? 'alarm' : i % 5 === 0 ? 'remote-command' : 'manual',
    alarmId: i === 0 ? 'alm-001' : undefined,
  }
})

export function getMockMedia(deviceId?: string): MediaItem[] {
  const list = deviceId ? items.filter((m) => m.deviceId === deviceId) : items
  return list.map((m) => ({ ...m })).sort((a, b) => b.capturedAt - a.capturedAt)
}

export function getMockMediaUrl(id: string): SignedMediaUrl {
  const item = items.find((m) => m.id === id)
  return {
    // Mocks have no real file. The player still takes the normal path — it
    // just renders the placeholder and says so, rather than faking a video.
    url: item?.thumbnailUrl ?? '',
    expiresAt: Date.now() + 15 * MINUTE,
    contentType: item?.kind === 'video' ? 'video/mp4' : 'image/svg+xml',
  }
}

export function deleteMockMedia(id: string): void {
  const index = items.findIndex((m) => m.id === id)
  if (index >= 0) items.splice(index, 1)
}
