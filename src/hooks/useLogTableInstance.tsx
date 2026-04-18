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
import type { LogEntry } from '../types/log'
import {
  textFilterFn,
  facetFilterFn,
  dateRangeFilterFn,
} from '../components/LogTable/filters/filterFunctions'

const FACET_THRESHOLD = 20

function renderCellValue(colId: string, value: unknown): string {
  if (colId === '_timestamp') {
    return value instanceof Date ? value.toISOString() : ''
  }
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    const s = JSON.stringify(value)
    return s.length > 200 ? s.slice(0, 200) + '…' : s
  }
  return String(value)
}

export function useLogTableInstance(
  data: LogEntry[],
  columnIds: string[],
  cellRenderers?: Record<string, (value: unknown) => React.ReactNode>
): Table<LogEntry> {
  const facetColumns = useMemo(() => {
    const facets = new Set<string>()
    for (const colId of columnIds) {
      if (colId === '_timestamp') continue
      const distinct = new Set(data.map((e) => String(e[colId] ?? '')))
      if (distinct.size > 0 && distinct.size <= FACET_THRESHOLD) facets.add(colId)
    }
    return facets
  }, [columnIds, data])

  const columns = useMemo<ColumnDef<LogEntry>[]>(() => {
    const expandCol: ColumnDef<LogEntry> = {
      id: '__expand',
      header: '',
      enableColumnFilter: false,
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

    const dataCols: ColumnDef<LogEntry>[] = columnIds.map((colId) => ({
      id: colId,
      accessorFn: (row) => (colId === '_timestamp' ? row._timestamp : row[colId]),
      header: colId === '_timestamp' ? 'timestamp' : colId,
      filterFn:
        colId === '_timestamp'
          ? dateRangeFilterFn
          : facetColumns.has(colId)
            ? facetFilterFn
            : textFilterFn,
      meta: {
        filterType:
          colId === '_timestamp'
            ? ('dateRange' as const)
            : facetColumns.has(colId)
              ? ('facet' as const)
              : ('text' as const),
      },
      cell: ({ row }) => {
        const raw = colId === '_timestamp' ? row.original._timestamp : row.original[colId]
        if (cellRenderers?.[colId]) return cellRenderers[colId](raw)
        return renderCellValue(colId, raw)
      },
    }))

    return [expandCol, ...dataCols]
  }, [columnIds, facetColumns, cellRenderers])

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return table
}
