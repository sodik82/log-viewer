import { useState } from 'react'
import type { ColumnConfig } from '../../types/log'
import { useColumnDrag } from '../../hooks/useColumnDrag'
import './ColumnSettingsPanel.css'

interface Props {
  config: ColumnConfig[]
  onClose: () => void
  onReorder: (src: string, dst: string) => void
  onSetVisible: (ids: string[], visible: boolean) => void
  onMerge: (ids: string[]) => void
  onUnmerge: (ids: string[]) => void
}

function colLabel(id: string) {
  return id === '_timestamp' ? 'timestamp' : id
}

export function ColumnSettingsPanel({
  config,
  onClose,
  onReorder,
  onSetVisible,
  onMerge,
  onUnmerge,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { dragOverId, dragHandleProps, dropTargetProps } = useColumnDrag((src, dst) => {
    onReorder(src, dst)
    // Keep selection in sync — reorderColumns only moves ids, not removes
  })

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedConfigs = config.filter((c) => selected.has(c.id))
  const visibleCount = config.filter((c) => c.visible).length
  const selectedVisibleCount = selectedConfigs.filter((c) => c.visible).length
  const selectedHiddenCount = selectedConfigs.filter((c) => !c.visible).length

  const canShow = selectedHiddenCount > 0
  const canHide = selectedVisibleCount > 0 && visibleCount - selectedVisibleCount >= 1
  const canMerge = selectedConfigs.filter((c) => c.visible).length >= 2
  const canUnmerge = selectedConfigs.some((c) => c.sourceColumns.length > 1)

  function act(fn: () => void) {
    fn()
    setSelected(new Set())
  }

  const configIds = config.map((c) => c.id)

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
          {config.map((col) => {
            const isSelected = selected.has(col.id)
            const isMerged = col.sourceColumns.length > 1

            return (
              <div
                key={col.id}
                {...dropTargetProps(col.id)}
                className={[
                  'col-settings__item',
                  dragOverId === col.id ? 'col-settings__item--drag-over' : '',
                  isSelected ? 'col-settings__item--selected' : '',
                  !col.visible ? 'col-settings__item--hidden' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="col-settings__handle" {...dragHandleProps(col.id)}>
                  ⠿
                </span>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(col.id)}
                  aria-label={`Select ${colLabel(col.id)}`}
                />
                <span className="col-settings__label">
                  {colLabel(col.displayName)}
                  {!col.visible && <span className="col-settings__hidden-tag"> hidden</span>}
                </span>
                {isMerged && (
                  <span className="col-settings__merge-badge">
                    ← {col.sourceColumns.map((s) => colLabel(s)).join(' • ')}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="col-settings__actions">
          <button
            type="button"
            className="col-settings__action-btn"
            disabled={!canShow}
            onClick={() => act(() => onSetVisible(Array.from(selected), true))}
          >
            Show
          </button>
          <button
            type="button"
            className="col-settings__action-btn"
            disabled={!canHide}
            onClick={() => act(() => onSetVisible(Array.from(selected), false))}
          >
            Hide
          </button>
          <button
            type="button"
            className="col-settings__action-btn col-settings__action-btn--merge"
            disabled={!canMerge}
            onClick={() => {
              // Pass ids in panel order
              const ordered = configIds.filter((id) => selected.has(id))
              act(() => onMerge(ordered))
            }}
          >
            Merge
          </button>
          <button
            type="button"
            className="col-settings__action-btn"
            disabled={!canUnmerge}
            onClick={() => act(() => onUnmerge(Array.from(selected)))}
          >
            Unmerge
          </button>
        </div>

        <div className="col-settings__footer">
          <button
            type="button"
            disabled={selected.size === config.length}
            onClick={() => setSelected(new Set(config.map((c) => c.id)))}
          >
            Check all
          </button>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => setSelected(new Set())}
          >
            Uncheck all
          </button>
        </div>
      </div>
    </>
  )
}
