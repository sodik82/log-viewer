import type { FilterFn } from '@tanstack/react-table'
import type { LogEntry } from '../../../types/log'

export type TextFilterValue = {
  operator: 'contains' | 'equals' | 'regex'
  value: string
}

export type DateRangeFilterValue = [Date | null, Date | null]

export const textFilterFn: FilterFn<LogEntry> = (row, columnId, filterValue: TextFilterValue) => {
  if (!filterValue?.value) return true
  const raw = row.getValue(columnId)
  const val = typeof raw === 'object' && raw !== null ? JSON.stringify(raw) : String(raw ?? '')
  const { operator, value } = filterValue
  if (operator === 'equals') return val.toLowerCase() === value.toLowerCase()
  if (operator === 'regex') {
    try {
      return new RegExp(value, 'i').test(val)
    } catch {
      return true
    }
  }
  return val.toLowerCase().includes(value.toLowerCase())
}
textFilterFn.autoRemove = (val: TextFilterValue) => !val?.value

export const dateRangeFilterFn: FilterFn<LogEntry> = (
  row,
  _columnId,
  filterValue: DateRangeFilterValue
) => {
  if (!filterValue) return true
  const [from, to] = filterValue
  if (!from && !to) return true
  const ts = row.original._timestamp
  if (!ts) return true
  if (from && ts < from) return false
  if (to && ts > to) return false
  return true
}
dateRangeFilterFn.autoRemove = (val: DateRangeFilterValue) => !val || (!val[0] && !val[1])
