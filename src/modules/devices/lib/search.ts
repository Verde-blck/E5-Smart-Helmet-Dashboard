import type { DeviceView } from '../types'

// IDs pasted from a helmet label, spreadsheet or PDF often carry separators or invisible
// characters ("866652 022956 404", non-breaking or zero-width spaces), so compare IDs with
// everything but letters and digits removed.
const INVISIBLE = /[\u200b-\u200d\u2060\ufeff]/g

function words(text: string): string {
  return text.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function compact(text: string): string {
  return text.replace(INVISIBLE, '').replace(/[^a-z0-9]/gi, '').toLowerCase()
}

export function matchesDeviceSearch(
  device: Pick<DeviceView, 'id' | 'name' | 'assignedTo'>,
  search: string
): boolean {
  const needle = words(search)
  if (!needle) return true
  const id = compact(needle)
  return (
    words(device.name).includes(needle) ||
    words(device.assignedTo?.name ?? '').includes(needle) ||
    (id.length > 0 && compact(device.id).includes(id))
  )
}
