import { Fragment, useRef } from 'react'
import { flexRender, type Column, type Table } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { LogEntry } from '../../types/log'
import { TextFilter } from './filters/TextFilter'
import { DateRangeFilter } from './filters/DateRangeFilter'
import { FacetFilter } from './filters/FacetFilter'
import { FilterPillBar } from './FilterPillBar'
import './LogTable.css'

const ROW_HEIGHT_ESTIMATE = 29

interface Props {
  table: Table<LogEntry>
  columnIds: string[]
  hasNoTimestamp: boolean
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

export function LogTable({ table, columnIds, hasNoTimestamp }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const headers = table.getHeaderGroups()[0].headers
  const rows = table.getRowModel().rows
  const filteredCount = table.getFilteredRowModel().rows.length
  const totalCount = table.getCoreRowModel().rows.length

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 10,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()
  const paddingTop = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0)
      : 0

  return (
    <div className="log-table-wrap">
      {hasNoTimestamp && (
        <div className="log-table__notice">No timestamp field detected — showing file order.</div>
      )}
      <FilterPillBar table={table} />
      <div className="log-table__scroll" ref={scrollRef}>
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
            {paddingTop > 0 && (
              <tr>
                <td colSpan={headers.length} style={{ height: paddingTop, padding: 0 }} />
              </tr>
            )}
            {virtualItems.map((virtualRow) => {
              const row = rows[virtualRow.index]
              return (
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
                      <td colSpan={headers.length} className="log-table__detail-cell">
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
              )
            })}
            {paddingBottom > 0 && (
              <tr>
                <td colSpan={headers.length} style={{ height: paddingBottom, padding: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="log-table__empty">No rows match the current filters.</div>
        )}
      </div>
      <div className="log-table__footer">
        {filteredCount.toLocaleString()} rows
        {filteredCount !== totalCount && ` (of ${totalCount.toLocaleString()})`}
      </div>
    </div>
  )
}
