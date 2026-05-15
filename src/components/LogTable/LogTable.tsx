import { Fragment, useMemo, useRef, useState } from 'react'
import { flexRender, type Column, type Table } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { LogEntry, ColumnConfig } from '../../types/log'
import { TextFilter } from './filters/TextFilter'
import { DateRangeFilter } from './filters/DateRangeFilter'
import { FacetFilter } from './filters/FacetFilter'
import { FilterPillBar } from './FilterPillBar'
import { CellFilterPopup } from './CellFilterPopup'
import { ColumnSettingsPanel } from './ColumnSettingsPanel'
import { highlightText } from '../../utils/highlightText'
import { useColumnDrag } from '../../hooks/useColumnDrag'
import type { TextFilterValue } from './filters/filterFunctions'
import './LogTable.css'

const ROW_HEIGHT_ESTIMATE = 29

interface Props {
  table: Table<LogEntry>
  hasNoTimestamp: boolean
  config: ColumnConfig[]
  presentIds: Set<string>
  onReorder: (src: string, dst: string) => void
  onSetVisible: (ids: string[], visible: boolean) => void
  onMerge: (ids: string[]) => void
  onUnmerge: (ids: string[]) => void
}

function renderExpandedValue(col: ColumnConfig, value: unknown): string {
  if (col.id === '_timestamp') {
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

export function LogTable({
  table,
  hasNoTimestamp,
  config,
  presentIds,
  onReorder,
  onSetVisible,
  onMerge,
  onUnmerge,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Visible + present columns in order (mirrors what TanStack received)
  const visibleCols = useMemo(
    () => config.filter((c) => c.visible && presentIds.has(c.id)),
    [config, presentIds]
  )
  const colById = useMemo(() => new Map(config.map((c) => [c.id, c])), [config])

  // row.original is pre-transformed data (merged column values already coalesced into entry[col.id])
  function getRowValue(col: ColumnConfig, entry: LogEntry): unknown {
    if (col.id === '_timestamp') return entry._timestamp
    return entry[col.id]
  }

  const {
    dragOverId: dragOverColId,
    dragHandleProps,
    dropTargetProps,
  } = useColumnDrag((src, dst) => {
    if (dst === '__expand') return
    onReorder(src, dst)
  })

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
    measureElement: (el) => el.getBoundingClientRect().height,
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
      <div className="log-table__toolbar">
        <button
          className="log-table__columns-btn"
          type="button"
          onClick={() => setSettingsOpen(true)}
        >
          Columns
        </button>
      </div>
      {settingsOpen && (
        <ColumnSettingsPanel
          config={config}
          presentIds={presentIds}
          onClose={() => setSettingsOpen(false)}
          onReorder={onReorder}
          onSetVisible={onSetVisible}
          onMerge={onMerge}
          onUnmerge={onUnmerge}
        />
      )}
      <div className="log-table__scroll" ref={scrollRef}>
        <table className="log-table" style={{ width: table.getTotalSize() }}>
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header.id}
                  {...(header.id !== '__expand'
                    ? { ...dragHandleProps(header.id), ...dropTargetProps(header.id) }
                    : {})}
                  className={[
                    'log-table__th',
                    header.id !== '__expand' ? 'log-table__th--draggable' : '',
                    dragOverColId === header.id ? 'log-table__th--drag-over' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ width: header.getSize() }}
                  title={
                    typeof header.column.columnDef.header === 'string'
                      ? header.column.columnDef.header
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
          {paddingTop > 0 && (
            <tbody>
              <tr>
                <td colSpan={headers.length} style={{ height: paddingTop, padding: 0 }} />
              </tr>
            </tbody>
          )}
          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index]
            const isAlt = virtualRow.index % 2 !== 0
            return (
              <tbody key={row.id} data-index={virtualRow.index} ref={rowVirtualizer.measureElement}>
                <tr className={`log-table__row${isAlt ? ' log-table__row--alt' : ''}`}>
                  {row.getVisibleCells().map((cell) => {
                    const filterType = cell.column.columnDef.meta?.filterType
                    const colId = cell.column.id
                    if (colId === '__expand' || filterType === 'dateRange') {
                      return (
                        <td key={cell.id} className="log-table__td">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    }
                    const col = colById.get(colId)
                    const rawVal = col ? getRowValue(col, row.original) : undefined
                    return (
                      <td key={cell.id} className="log-table__td">
                        <CellFilterPopup
                          value={rawVal}
                          column={cell.column}
                          filterType={filterType ?? 'text'}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </CellFilterPopup>
                      </td>
                    )
                  })}
                </tr>
                {row.getIsExpanded() && (
                  <tr className="log-table__detail-row">
                    <td colSpan={headers.length} className="log-table__detail-cell">
                      <div className="log-table__detail-panel">
                        {visibleCols.map((col) => {
                          const raw = getRowValue(col, row.original)
                          const tanCol = table.getColumn(col.id)
                          const filterType = tanCol?.columnDef.meta?.filterType
                          return (
                            <Fragment key={col.id}>
                              {tanCol && filterType !== 'dateRange' ? (
                                <CellFilterPopup
                                  value={raw}
                                  column={tanCol}
                                  filterType={filterType ?? 'text'}
                                  variant="inline"
                                >
                                  <span className="log-table__detail-key">{col.displayName}</span>
                                </CellFilterPopup>
                              ) : (
                                <span className="log-table__detail-key">{col.displayName}</span>
                              )}
                              <pre className="log-table__detail-val">
                                {(() => {
                                  const text = renderExpandedValue(col, raw)
                                  const fv = tanCol?.getFilterValue()
                                  return typeof fv === 'object' && fv !== null && 'operator' in fv
                                    ? highlightText(text, fv as TextFilterValue)
                                    : text
                                })()}
                              </pre>
                            </Fragment>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            )
          })}
          {paddingBottom > 0 && (
            <tbody>
              <tr>
                <td colSpan={headers.length} style={{ height: paddingBottom, padding: 0 }} />
              </tr>
            </tbody>
          )}
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
