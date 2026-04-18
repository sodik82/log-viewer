import { useMemo, Fragment } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  flexRender,
  type ColumnDef,
  type Column,
} from '@tanstack/react-table'
import type { LogEntry } from '../../types/log'
import { textFilterFn, facetFilterFn, dateRangeFilterFn } from './filters/filterFunctions'
import { TextFilter } from './filters/TextFilter'
import { DateRangeFilter } from './filters/DateRangeFilter'
import { FacetFilter } from './filters/FacetFilter'
import { FilterPillBar } from './FilterPillBar'
import './LogTable.css'

const FACET_THRESHOLD = 20

interface Props {
  data: LogEntry[]
  columnIds: string[]
  hasNoTimestamp: boolean
  cellRenderers?: Record<string, (value: unknown) => React.ReactNode>
}

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

function renderExpandedValue(colId: string, value: unknown): string {
  if (colId === '_timestamp') {
    return value instanceof Date ? value.toISOString() : ''
  }
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function renderFilter(column: Column<LogEntry, unknown>) {
  const filterType = column.columnDef.meta?.filterType
  if (filterType === 'dateRange') return <DateRangeFilter column={column} />
  if (filterType === 'facet') return <FacetFilter column={column} />
  return <TextFilter column={column} />
}

export function LogTable({ data, columnIds, hasNoTimestamp, cellRenderers }: Props) {
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

  const headers = table.getHeaderGroups()[0].headers
  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <div className="log-table-wrap">
      {hasNoTimestamp && (
        <div className="log-table__notice">No timestamp field detected — showing file order.</div>
      )}
      <FilterPillBar table={table} />
      <div className="log-table__scroll">
        <table className="log-table">
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header.id}
                  className="log-table__th"
                  style={
                    header.column.columnDef.size
                      ? { width: header.column.columnDef.size }
                      : undefined
                  }
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
            <tr className="log-table__filter-row">
              {headers.map((header) => (
                <th key={header.id} className="log-table__filter-cell">
                  {header.column.getCanFilter() ? renderFilter(header.column) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <tr className="log-table__row">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="log-table__td">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr className="log-table__detail-row">
                    <td colSpan={columns.length} className="log-table__detail-cell">
                      <div className="log-table__detail-panel">
                        {columnIds.map((colId) => {
                          const raw =
                            colId === '_timestamp' ? row.original._timestamp : row.original[colId]
                          return (
                            <Fragment key={colId}>
                              <span className="log-table__detail-key">
                                {colId === '_timestamp' ? 'timestamp' : colId}
                              </span>
                              <pre className="log-table__detail-val">
                                {renderExpandedValue(colId, raw)}
                              </pre>
                            </Fragment>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {table.getRowModel().rows.length === 0 && (
          <div className="log-table__empty">No rows match the current filters.</div>
        )}
      </div>
      <div className="log-table__footer">
        {filteredCount.toLocaleString()} rows
        {filteredCount !== data.length && ` (of ${data.length.toLocaleString()})`}
      </div>
    </div>
  )
}
