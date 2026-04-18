import type { FilterFn } from '@tanstack/react-table'
import type { LogEntry } from '../../../types/log'

export type TextFilterValue = {
  operator: 'contains' | 'equals' | 'regex'
  negate: boolean
  value: string
  compiledRegex?: RegExp
}

export type FacetFilterValue = {
  mode: 'include' | 'exclude'
  values: string[]
}

export type DateRangePreset = 'last15m' | 'last1h' | 'last6h' | 'last24h'
export type DateRangeFilterValue =
  | { type: 'preset'; preset: DateRangePreset }
  | { type: 'custom'; from: Date | null; to: Date | null }

export function normalizeValue(raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') return ''
  if (typeof raw === 'object') return JSON.stringify(raw)
  return String(raw)
}

// Detects nested quantifiers that cause catastrophic backtracking: (a+)+, (a*)*, etc.
export function isReDoSRisk(pattern: string): boolean {
  return /\([^)]*[+*][^)]*\)[+*?{]/.test(pattern)
}

export const textFilterFn: FilterFn<LogEntry> = (row, columnId, filterValue: TextFilterValue) => {
  if (!filterValue?.value) return true
  const raw = row.getValue(columnId)
  const val = normalizeValue(raw)
  const { operator, value, negate, compiledRegex } = filterValue
  let match: boolean
  if (operator === 'equals') {
    match = val.toLowerCase() === value.toLowerCase()
  } else if (operator === 'regex') {
    try {
      const re = compiledRegex ?? new RegExp(value, 'i')
      match = re.test(val)
    } catch {
      match = true
    }
  } else {
    match = val.toLowerCase().includes(value.toLowerCase())
  }
  return negate ? !match : match
}
textFilterFn.autoRemove = (val: TextFilterValue) => !val?.value

export const facetFilterFn: FilterFn<LogEntry> = (row, columnId, filterValue: FacetFilterValue) => {
  if (!filterValue?.values?.length) return true
  const raw = row.getValue(columnId)
  const val = normalizeValue(raw)
  const match = filterValue.values.includes(val)
  return filterValue.mode === 'exclude' ? !match : match
}
facetFilterFn.autoRemove = (val: FacetFilterValue) => !val?.values?.length

export const PRESET_OFFSETS: Record<DateRangePreset, number> = {
  last15m: 15 * 60 * 1000,
  last1h: 60 * 60 * 1000,
  last6h: 6 * 60 * 60 * 1000,
  last24h: 24 * 60 * 60 * 1000,
}

export const dateRangeFilterFn: FilterFn<LogEntry> = (
  row,
  _columnId,
  filterValue: DateRangeFilterValue
) => {
  if (!filterValue) return true
  const ts = row.original._timestamp
  if (!ts) return true

  let from: Date | null
  let to: Date | null
  if (filterValue.type === 'preset') {
    to = new Date()
    from = new Date(Date.now() - PRESET_OFFSETS[filterValue.preset])
  } else {
    from = filterValue.from
    to = filterValue.to
    if (!from && !to) return true
  }

  if (from && ts < from) return false
  if (to && ts > to) return false
  return true
}
dateRangeFilterFn.autoRemove = (val: DateRangeFilterValue) => {
  if (!val) return true
  if (val.type === 'preset') return false
  return !val.from && !val.to
}
