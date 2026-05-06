import { useRef, useState } from 'react'
import { type Table } from '@tanstack/react-table'
import type { LogEntry } from '../../types/log'
import './ColumnSettingsPanel.css'

interface Props {
  table: Table<LogEntry>
  onClose: () => void
}

function colLabel(id: string) {
  return id === '_timestamp' ? 'timestamp' : id
}

export function ColumnSettingsPanel({ table, onClose }: Props) {
  const dragItemRef = useRef<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // All data columns in their current order (as stored in columnOrder state)
  const orderedColumns = table
    .getState()
    .columnOrder.filter((id) => id !== '__expand')
    .map((id) => table.getColumn(id))
    .filter(Boolean)

  // Columns present in the current file set but not yet in the order (e.g. first load)
  const inOrder = new Set(table.getState().columnOrder)
  const unorderedColumns = table
    .getAllLeafColumns()
    .filter((c) => c.id !== '__expand' && !inOrder.has(c.id))

  const allColumns = [...orderedColumns, ...unorderedColumns]

  function reorder(srcId: string, dstId: string) {
    const order = table.getState().columnOrder
    const next = [...order]
    const from = next.indexOf(srcId)
    const to = next.indexOf(dstId)
    if (from === -1 || to === -1) return
    next.splice(from, 1)
    next.splice(to, 0, srcId)
    table.setColumnOrder(next)
  }

  const visibleCount = allColumns.filter((c) => c?.getIsVisible()).length

  return (
    <>
      <div className="col-settings__backdrop" onClick={onClose} />
      <div className="col-settings__panel">
        <div className="col-settings__header">
          <span className="col-settings__title">Columns</span>
          <button
            className="col-settings__close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="col-settings__list">
          {allColumns.map((col) => {
            if (!col) return null
            const isDragOver = dragOverId === col.id
            const isVisible = col.getIsVisible()
            return (
              <div
                key={col.id}
                className={[
                  'col-settings__item',
                  isDragOver ? 'col-settings__item--drag-over' : '',
                  !isVisible ? 'col-settings__item--hidden' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                draggable
                onDragStart={() => {
                  dragItemRef.current = col.id
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverId(col.id)
                }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={() => {
                  const src = dragItemRef.current
                  if (src && src !== col.id) reorder(src, col.id)
                  setDragOverId(null)
                  dragItemRef.current = null
                }}
              >
                <span className="col-settings__handle">⠿</span>
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => {
                    if (isVisible && visibleCount <= 1) return
                    col.toggleVisibility()
                  }}
                  aria-label={`${isVisible ? 'Hide' : 'Show'} ${colLabel(col.id)}`}
                />
                <span className="col-settings__label">{colLabel(col.id)}</span>
              </div>
            )
          })}
        </div>
        <div className="col-settings__footer">
          <button type="button" onClick={() => table.toggleAllColumnsVisible(true)}>
            Show all
          </button>
          <button
            type="button"
            disabled={visibleCount <= 1}
            onClick={() => {
              if (visibleCount <= 1) return
              table.toggleAllColumnsVisible(false)
            }}
          >
            Hide all
          </button>
        </div>
      </div>
    </>
  )
}
