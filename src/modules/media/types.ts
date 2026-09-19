export type MediaKind = 'photo' | 'video'

/**
 * FRD §4 Recording & Media Management. 'uploading' is not cosmetic: helmets
 * buffer while offline and upload on reconnect, so the backend knows a file
 * exists before the bytes have landed. Showing it as available would give the
 * operator a broken player.
 */
export type MediaStatus = 'uploading' | 'available' | 'failed'

export type MediaTrigger = 'manual' | 'alarm' | 'remote-command' | 'scheduled'

/** Filters sent to the API and used as the cache key. */
export interface MediaQuery {
  /** Omit to fetch both kinds — the device detail strip does. */
  kind?: MediaKind
  deviceId?: string
  /** A single calendar day, YYYY-MM-DD, matched against capturedAt. */
  date?: string
  /** Free text over the file name. Video Record only. */
  search?: string
}

/** Local-day bounds for a YYYY-MM-DD string, since capturedAt is epoch ms. */
export function dayBounds(date: string): { from: number; to: number } {
  return {
    from: new Date(`${date}T00:00:00`).getTime(),
    to: new Date(`${date}T23:59:59.999`).getTime(),
  }
}

export interface MediaItem {
  id: string
  deviceId: string
  deviceName: string
  /** Site the helmet was at when it captured this. */
  site?: string
  kind: MediaKind
  status: MediaStatus
  /** When the helmet recorded it. */
  capturedAt: number
  /** When the bytes reached storage — diverges from capturedAt after an offline spell. */
  uploadedAt?: number
  durationMs?: number
  sizeBytes?: number
  /**
   * Signed, but with a long TTL. Thumbnails ship with the list because issuing
   * one short-lived URL per grid tile would mean 50 round-trips to render a
   * page and half of them expiring while the operator scrolls. Full assets are
   * fetched on demand instead — see fetchMediaUrl.
   */
  /** What the file is called in storage. Shown and searched in Video Record. */
  fileName?: string
  thumbnailUrl?: string
  triggeredBy?: MediaTrigger
  alarmId?: string
}

/** What GET /media/:id/url returns. Never cached beyond its TTL. */
export interface SignedMediaUrl {
  url: string
  expiresAt: number
  /** MIME type, so the player doesn't have to guess from the extension. */
  contentType?: string
}

export function formatBytes(bytes?: number): string | null {
  if (bytes == null) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDuration(ms?: number): string | null {
  if (ms == null) return null
  const total = Math.round(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
