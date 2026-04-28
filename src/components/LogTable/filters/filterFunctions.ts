import type { Column, FilterFn } from '@tanstack/react-table'
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

export const DEBOUNCE_MS = 150

export const OP_SHORT: Record<TextFilterValue['operator'], string> = {
  contains: '~',
  equals: '=',
  regex: '.*',
}

export function textFilterTriggerLabel(fv: TextFilterValue): string {
  return `${fv.negate ? 'NOT ' : ''}${OP_SHORT[fv.operator]} ${fv.value}`
}

export function normalizeValue(raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') return ''
  if (typeof raw === 'object') return JSON.stringify(raw)
  return String(raw)
}

// Detects nested quantifiers that cause catastrophic backtracking: (a+)+, (a*)*, etc.
export function isReDoSRisk(pattern: string): boolean {
  return /\([^)]*[+*][^)]*\)[+*?{]/.test(pattern)
}

export type RegexCompileResult =
  | { ok: true; regex: RegExp }
  | { ok: false; error: 'redos' | 'invalid' }

export function tryCompileRegex(pattern: string): RegexCompileResult {
  if (isReDoSRisk(pattern)) return { ok: false, error: 'redos' }
  try {
    return { ok: true, regex: new RegExp(pattern, 'i') }
  } catch {
    return { ok: false, error: 'invalid' }
  }
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

// Handles facet columns that have been switched to text-search mode.
// Duck-types the filter value: if it has `operator` it's a TextFilterValue, otherwise FacetFilterValue.
export const smartFilterFn: FilterFn<LogEntry> = (row, columnId, filterValue, addMeta) => {
  if (!filterValue) return true
  if ('operator' in (filterValue as object))
    return textFilterFn(row, columnId, filterValue as TextFilterValue, addMeta)
  return facetFilterFn(row, columnId, filterValue as FacetFilterValue, addMeta)
}
smartFilterFn.autoRemove = (val) => {
  if (!val) return true
  if ('operator' in (val as object)) return textFilterFn.autoRemove!(val as TextFilterValue)
  return facetFilterFn.autoRemove!(val as FacetFilterValue)
}

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

export function applyCellFilter(
  column: Column<LogEntry>,
  filterType: 'text' | 'facet',
  strVal: string,
  mode: 'in' | 'out'
): void {
  if (filterType === 'facet') {
    const existing = column.getFilterValue() as FacetFilterValue | undefined
    const targetMode = mode === 'in' ? 'include' : 'exclude'
    if (existing && 'values' in existing && existing.mode === targetMode) {
      const values = [...new Set([...existing.values, strVal])]
      column.setFilterValue({ mode: targetMode, values })
    } else {
      column.setFilterValue({ mode: targetMode, values: [strVal] })
    }
  } else {
    column.setFilterValue({ operator: 'equals', negate: mode === 'out', value: strVal })
  }
}
