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
import type { LogEntry, ColumnMeta } from '../types/log'
import {
  textFilterFn,
  smartFilterFn,
  dateRangeFilterFn,
  type TextFilterValue,
} from '../components/LogTable/filters/filterFunctions'
import { highlightText } from '../utils/highlightText'

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
  columnMetas: ColumnMeta[],
  ordering?: { columnOrder: string[]; onColumnOrderChange: (order: string[]) => void },
  visibility?: {
    columnVisibility: Record<string, boolean>
    onColumnVisibilityChange: (vis: Record<string, boolean>) => void
  },
  cellRenderers?: Record<string, (value: unknown) => React.ReactNode>
): Table<LogEntry> {
  const facetColumns = useMemo(() => {
    const facets = new Set<string>()
    for (const { id: colId } of columnMetas) {
      if (colId === '_timestamp') continue
      const distinct = new Set(data.map((e) => String(e[colId] ?? '')))
      if (distinct.size > 0 && distinct.size <= FACET_THRESHOLD) facets.add(colId)
    }
    return facets
  }, [columnMetas, data])

  const columns = useMemo<ColumnDef<LogEntry>[]>(() => {
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

    const dataCols: ColumnDef<LogEntry>[] = columnMetas.map(({ id: colId, width }) => ({
      id: colId,
      accessorFn: (row) => (colId === '_timestamp' ? row._timestamp : row[colId]),
      header: colId === '_timestamp' ? 'timestamp' : colId,
      size: width,
      filterFn:
        colId === '_timestamp'
          ? dateRangeFilterFn
          : facetColumns.has(colId)
            ? smartFilterFn
            : textFilterFn,
      meta: {
        filterType:
          colId === '_timestamp'
            ? ('dateRange' as const)
            : facetColumns.has(colId)
              ? ('facet' as const)
              : ('text' as const),
      },
      cell: ({ row, column }) => {
        const raw = colId === '_timestamp' ? row.original._timestamp : row.original[colId]
        if (cellRenderers?.[colId]) return cellRenderers[colId](raw)
        const text = renderCellValue(colId, raw)
        const fv = column.getFilterValue()
        return typeof fv === 'object' && fv !== null && 'operator' in fv
          ? highlightText(text, fv as TextFilterValue)
          : text
      },
    }))

    return [expandCol, ...dataCols]
  }, [columnMetas, facetColumns, cellRenderers])

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    state: {
      ...(ordering ? { columnOrder: ['__expand', ...ordering.columnOrder] } : {}),
      ...(visibility ? { columnVisibility: visibility.columnVisibility } : {}),
    },
    ...(ordering && {
      onColumnOrderChange: (updater) => {
        const current: string[] = ['__expand', ...ordering.columnOrder]
        const next = typeof updater === 'function' ? updater(current) : updater
        ordering.onColumnOrderChange(next.filter((id) => id !== '__expand'))
      },
    }),
    ...(visibility && {
      onColumnVisibilityChange: (updater) => {
        const current = visibility.columnVisibility
        const next = typeof updater === 'function' ? updater(current) : updater
        visibility.onColumnVisibilityChange(next)
      },
    }),
  })

  return table
}
