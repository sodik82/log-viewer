import { format } from 'date-fns'
import type { Table } from '@tanstack/react-table'
import type { LogEntry } from '../../types/log'
import type {
  TextFilterValue,
  FacetFilterValue,
  DateRangeFilterValue,
  DateRangePreset,
} from './filters/filterFunctions'

interface Props {
  table: Table<LogEntry>
}

const PRESET_LABELS: Record<DateRangePreset, string> = {
  last15m: 'last 15m',
  last1h: 'last 1h',
  last6h: 'last 6h',
  last24h: 'last 24h',
}

const OP_LABELS: Record<string, string> = {
  contains: 'contains',
  equals: '=',
  regex: '~=',
}

function textPillLabel(colId: string, fv: TextFilterValue): string {
  const op = OP_LABELS[fv.operator] ?? fv.operator
  return `${colId} ${fv.negate ? 'NOT ' : ''}${op} "${fv.value}"`
}

function pillLabel(colId: string, filterType: string | undefined, filterValue: unknown): string {
  if (filterType === 'dateRange') {
    const fv = filterValue as DateRangeFilterValue
    if (fv.type === 'preset') return `${colId}: ${PRESET_LABELS[fv.preset]}`
    const fromStr = fv.from ? format(fv.from, 'MM/dd HH:mm:ss') : '…'
    const toStr = fv.to ? format(fv.to, 'MM/dd HH:mm:ss') : '…'
    return `${colId}: ${fromStr} – ${toStr}`
  }
  // Duck-type: TextFilterValue has `operator`; works for both 'text' columns and facet
  // columns that have been switched to text-search mode.
  if (filterValue && typeof filterValue === 'object' && 'operator' in filterValue) {
    return textPillLabel(colId, filterValue as TextFilterValue)
  }
  const fv = filterValue as FacetFilterValue
  const qualifier = fv.mode === 'exclude' ? 'NOT IN' : 'IN'
  const valLabels = fv.values.map((v) => (v === '' ? '(unset)' : v))
  return `${colId} ${qualifier} [${valLabels.join(', ')}]`
}

export function FilterPillBar({ table }: Props) {
  const columnFilters = table.getState().columnFilters
  if (columnFilters.length === 0) return null

  return (
    <div className="filter-pill-bar">
      <span className="filter-pill-bar__label">Filters:</span>
      {columnFilters.map(({ id, value }) => {
        const col = table.getColumn(id)
        const filterType = col?.columnDef.meta?.filterType
        const label = pillLabel(id, filterType, value)
        return (
          <span key={id} className="filter-pill">
            {label}
            <button
              className="filter-pill__remove"
              type="button"
              onClick={() => col?.setFilterValue(undefined)}
            >
              ×
            </button>
          </span>
        )
      })}
      <button
        className="filter-pill-bar__clear-all"
        type="button"
        onClick={() => table.resetColumnFilters()}
      >
        Clear all
      </button>
    </div>
  )
}
