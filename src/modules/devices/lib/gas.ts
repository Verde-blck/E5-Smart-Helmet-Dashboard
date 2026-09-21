import type { GasReading } from '@/shared/lib/api-normalize'

export type GasLevel = 'normal' | 'warning' | 'danger' | 'unknown'

export interface GasSpec {
  label: string
  unit: string
  /** Most gases are dangerous as they rise. */
  warnAbove?: number
  dangerAbove?: number
  /** Oxygen is the exception — it alarms in both directions. */
  warnBelow?: number
  dangerBelow?: number
  note?: string
}

/**
 * Default alarm thresholds.
 *
 * ⚠ These are widely-used occupational defaults, not an authority. Exposure
 * limits vary by jurisdiction, by employer policy, and by the work being done,
 * and the helmet itself carries its own configured thresholds — the vendor's
 * console exposes them per device under Unit Setting.
 *
 * Two consequences worth being explicit about:
 *
 *  1. These need signing off by whoever owns site safety before anyone relies
 *     on the colours.
 *  2. Once the backend exposes the device's own configured thresholds, those
 *     should win over this table, so the dashboard and the helmet can never
 *     disagree about what counts as an alarm.
 *
 * A gas with no entry here is displayed without judgement rather than assumed
 * safe — see evaluateGas.
 */
export const GAS_SPECS: Record<string, GasSpec> = {
  O2: {
    label: 'Oxygen',
    unit: '%',
    // Below 19.5% is oxygen-deficient and the classic confined-space killer.
    // Above 23.5% is oxygen-enriched, which makes everything flammable.
    dangerBelow: 19.5,
    warnBelow: 20.0,
    warnAbove: 22.0,
    dangerAbove: 23.5,
    note: 'Normal air is 20.9%',
  },
  CH4: { label: 'Methane', unit: '%LEL', warnAbove: 10, dangerAbove: 20, note: 'Explosive risk' },
  CO: { label: 'Carbon monoxide', unit: 'ppm', warnAbove: 35, dangerAbove: 100 },
  H2S: { label: 'Hydrogen sulphide', unit: 'ppm', warnAbove: 10, dangerAbove: 15 },
  NH3: { label: 'Ammonia', unit: 'ppm', warnAbove: 25, dangerAbove: 35 },
  CH2O: { label: 'Formaldehyde', unit: 'ppm', warnAbove: 0.75, dangerAbove: 2 },
  NO2: { label: 'Nitrogen dioxide', unit: 'ppm', warnAbove: 3, dangerAbove: 5 },
  NO: { label: 'Nitric oxide', unit: 'ppm', warnAbove: 25, dangerAbove: 35 },
  CO2: { label: 'Carbon dioxide', unit: 'ppm', warnAbove: 5000, dangerAbove: 30000 },
  SF6: { label: 'Sulphur hexafluoride', unit: 'ppm' },
  H2: { label: 'Hydrogen', unit: '%LEL', warnAbove: 10, dangerAbove: 20 },
  N2: { label: 'Nitrogen', unit: '%' },
}

export interface GasStatus {
  gas: string
  value: number
  level: GasLevel
  spec: GasSpec
  /** Why it's flagged, in words an operator can act on. */
  reason?: string
}

export function evaluateGas(reading: GasReading): GasStatus {
  const spec = GAS_SPECS[reading.gas] ?? { label: reading.gas, unit: '' }
  const { value } = reading

  // No threshold defined: show the number, make no claim about it. Calling an
  // unknown gas "normal" would be a safety claim we can't support.
  const hasThresholds =
    spec.dangerAbove !== undefined ||
    spec.dangerBelow !== undefined ||
    spec.warnAbove !== undefined ||
    spec.warnBelow !== undefined

  if (!hasThresholds) return { gas: reading.gas, value, level: 'unknown', spec }

  if (spec.dangerBelow !== undefined && value < spec.dangerBelow) {
    return { gas: reading.gas, value, level: 'danger', spec, reason: 'Oxygen deficient' }
  }
  if (spec.dangerAbove !== undefined && value > spec.dangerAbove) {
    return {
      gas: reading.gas,
      value,
      level: 'danger',
      spec,
      reason: reading.gas === 'O2' ? 'Oxygen enriched' : 'Above danger threshold',
    }
  }
  if (spec.warnBelow !== undefined && value < spec.warnBelow) {
    return { gas: reading.gas, value, level: 'warning', spec, reason: 'Oxygen falling' }
  }
  if (spec.warnAbove !== undefined && value > spec.warnAbove) {
    return {
      gas: reading.gas,
      value,
      level: 'warning',
      spec,
      reason: reading.gas === 'O2' ? 'Oxygen rising' : 'Above warning threshold',
    }
  }

  return { gas: reading.gas, value, level: 'normal', spec }
}

export function evaluateAll(readings: GasReading[] | undefined): GasStatus[] {
  return (readings ?? []).map(evaluateGas)
}

/** The single worst level across a set, for a badge or a headline count. */
export function worstLevel(statuses: GasStatus[]): GasLevel {
  if (statuses.some((s) => s.level === 'danger')) return 'danger'
  if (statuses.some((s) => s.level === 'warning')) return 'warning'
  if (statuses.some((s) => s.level === 'normal')) return 'normal'
  return 'unknown'
}

export const GAS_LEVEL_STYLE: Record<GasLevel, { text: string; chip: string; dot: string }> = {
  danger: {
    text: 'text-red-700',
    chip: 'bg-red-50 text-red-700 ring-red-200',
    dot: 'bg-red-500',
  },
  warning: {
    text: 'text-amber-700',
    chip: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-400',
  },
  normal: {
    text: 'text-slate-800',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  unknown: {
    text: 'text-slate-600',
    chip: 'bg-slate-50 text-slate-500 ring-slate-200',
    dot: 'bg-slate-300',
  },
}
