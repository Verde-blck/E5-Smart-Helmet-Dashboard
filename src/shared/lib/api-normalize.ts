export function num(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function flag(value: unknown): boolean | undefined {
  if (value === null || value === undefined || value === '') return undefined
  return value === '1' || value === 1 || value === true
}

export function ts(value: unknown): number | undefined {
  if (typeof value !== 'string' || !value) return undefined
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

export function millivoltsToVolts(value: unknown): number | undefined {
  const mv = num(value)
  return mv === undefined ? undefined : mv / 1000
}

export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  last: boolean
  first: boolean
  empty: boolean
}

export function pageContent<T>(page: Page<T> | T[] | null | undefined): T[] {
  if (!page) return []
  return Array.isArray(page) ? page : (page.content ?? [])
}

export interface GasReading {
  gas: string
  value: number
}

export function parseGasData(raw: unknown): GasReading[] {
  if (typeof raw !== 'string' || !raw) return []

  return raw
    .split(';')
    .map((entry) => {
      const [gas, value] = entry.split('--')
      if (!gas || value === undefined || value === '') return null
      const parsed = num(value)
      return parsed === undefined ? null : { gas: gas.trim(), value: parsed }
    })
    .filter((r): r is GasReading => r !== null)
}

export function shortDeviceName(deviceId: string): string {
  return deviceId.length > 5 ? `…${deviceId.slice(-5)}` : deviceId
}
