import { Fragment } from 'react'
import { flexRender, type Column, type Table } from '@tanstack/react-table'
import type { LogEntry } from '../../types/log'
import { TextFilter } from './filters/TextFilter'
import { DateRangeFilter } from './filters/DateRangeFilter'
import { FacetFilter } from './filters/FacetFilter'
import { FilterPillBar } from './FilterPillBar'
import './LogTable.css'

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
  const headers = table.getHeaderGroups()[0].headers
  const filteredCount = table.getFilteredRowModel().rows.length
  const totalCount = table.getCoreRowModel().rows.length

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
            ))}
          </tbody>
        </table>
        {table.getRowModel().rows.length === 0 && (
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
