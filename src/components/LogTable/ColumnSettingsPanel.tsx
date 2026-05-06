import { type Table } from '@tanstack/react-table'
import type { LogEntry } from '../../types/log'
import { useColumnDrag } from '../../hooks/useColumnDrag'
import { reorderColumns } from '../../utils/reorderColumns'
import './ColumnSettingsPanel.css'

interface Props {
  table: Table<LogEntry>
  onClose: () => void
}

function colLabel(id: string) {
  return id === '_timestamp' ? 'timestamp' : id
}

export function ColumnSettingsPanel({ table, onClose }: Props) {
  const { dragOverId, dragHandleProps, dropTargetProps } = useColumnDrag((src, dst) =>
    table.setColumnOrder(reorderColumns(table.getState().columnOrder, src, dst))
  )

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
            const isVisible = col.getIsVisible()
            return (
              <div
                key={col.id}
                {...dropTargetProps(col.id)}
                className={[
                  'col-settings__item',
                  dragOverId === col.id ? 'col-settings__item--drag-over' : '',
                  !isVisible ? 'col-settings__item--hidden' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="col-settings__handle" {...dragHandleProps(col.id)}>
                  ⠿
                </span>
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
