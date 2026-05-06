import { useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  type ColumnDef,
  type Table,
} from '@tanstack/react-table'
import type { LogEntry, ColumnConfig } from '../types/log'
import {
  textFilterFn,
  smartFilterFn,
  dateRangeFilterFn,
  type TextFilterValue,
} from '../components/LogTable/filters/filterFunctions'
import { highlightText } from '../utils/highlightText'

const FACET_THRESHOLD = 20

function renderCellValue(col: ColumnConfig, value: unknown): string {
  if (col.id === '_timestamp') {
    return value instanceof Date ? value.toISOString() : ''
  }
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    const s = JSON.stringify(value)
    return s.length > 200 ? s.slice(0, 200) + '…' : s
  }
  return String(value)
}

export function useLogTableInstance(data: LogEntry[], columns: ColumnConfig[]): Table<LogEntry> {
  // Pre-transform: write coalesced values for merged columns directly into each row entry.
  // TanStack's coreRowModel only invalidates its row cache when the `data` reference changes,
  // not when `columns` change. Without this, row._valuesCache retains pre-merge values after
  // a merge, causing filters to see stale data for merged columns.
  const transformedData = useMemo(() => {
    const mergedCols = columns.filter((c) => c.sourceColumns.length > 1)
    if (mergedCols.length === 0) return data
    return data.map((entry) => {
      const extra: Record<string, unknown> = {}
      for (const col of mergedCols) {
        for (const src of col.sourceColumns) {
          const v = entry[src]
          if (v !== null && v !== undefined && v !== '') {
            extra[col.id] = v
            break
          }
        }
      }
      return Object.keys(extra).length > 0 ? ({ ...entry, ...extra } as LogEntry) : entry
    })
  }, [data, columns])

  const facetColumns = useMemo(() => {
    const facets = new Set<string>()
    for (const col of columns) {
      if (col.id === '_timestamp') continue
      const distinct = new Set(transformedData.map((e) => String(e[col.id] ?? '')))
      if (distinct.size > 0 && distinct.size <= FACET_THRESHOLD) facets.add(col.id)
    }
    return facets
  }, [columns, transformedData])

  const tanstackColumns = useMemo<ColumnDef<LogEntry>[]>(() => {
    const expandCol: ColumnDef<LogEntry> = {
      id: '__expand',
      header: '',
      enableColumnFilter: false,
      enableHiding: false,
      size: 28,
      cell: ({ row }) => (
        <button
          className="log-table__expand-btn"
          onClick={() => row.toggleExpanded()}
          type="button"
          aria-label={row.getIsExpanded() ? 'collapse row' : 'expand row'}
        >
          {row.getIsExpanded() ? '▼' : '▶'}
        </button>
      ),
    }

    const dataCols: ColumnDef<LogEntry>[] = columns.map((col) => ({
      id: col.id,
      // Data is pre-transformed: merged column values are already written to entry[col.id].
      accessorFn: (row) => (col.id === '_timestamp' ? row._timestamp : row[col.id]),
      header: col.displayName,
      size: col.width,
      filterFn:
        col.id === '_timestamp'
          ? dateRangeFilterFn
          : facetColumns.has(col.id)
            ? smartFilterFn
            : textFilterFn,
      meta: {
        filterType:
          col.id === '_timestamp'
            ? ('dateRange' as const)
            : facetColumns.has(col.id)
              ? ('facet' as const)
              : ('text' as const),
      },
      cell: ({ row, column }) => {
        const raw = col.id === '_timestamp' ? row.original._timestamp : row.original[col.id]
        const text = renderCellValue(col, raw)
        const fv = column.getFilterValue()
        return typeof fv === 'object' && fv !== null && 'operator' in fv
          ? highlightText(text, fv as TextFilterValue)
          : text
      },
    }))

    return [expandCol, ...dataCols]
  }, [columns, facetColumns])

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: transformedData,
    columns: tanstackColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return table
}
