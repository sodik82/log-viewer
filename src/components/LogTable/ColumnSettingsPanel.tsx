import { useState } from 'react'
import type { ColumnConfig } from '../../types/log'
import { useColumnDrag } from '../../hooks/useColumnDrag'
import './ColumnSettingsPanel.css'

interface Props {
  config: ColumnConfig[]
  presentIds: Set<string>
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
  presentIds,
  onClose,
  onReorder,
  onSetVisible,
  onMerge,
  onUnmerge,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showNotPresent, setShowNotPresent] = useState(false)

  const { dragOverId, dragHandleProps, dropTargetProps } = useColumnDrag((src, dst) => {
    onReorder(src, dst)
  })

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hasNotPresent = config.some((c) => !presentIds.has(c.id))
  const notPresentCount = config.filter((c) => !presentIds.has(c.id)).length
  const displayedConfig = showNotPresent ? config : config.filter((c) => presentIds.has(c.id))

  const selectedConfigs = config.filter((c) => selected.has(c.id))
  const selectedVisibleCount = selectedConfigs.filter((c) => c.visible).length
  const selectedHiddenCount = selectedConfigs.filter((c) => !c.visible).length

  const presentVisibleCount = config.filter((c) => c.visible && presentIds.has(c.id)).length
  const selectedPresentVisibleCount = selectedConfigs.filter(
    (c) => c.visible && presentIds.has(c.id)
  ).length

  const canShow = selectedHiddenCount > 0
  const canHide = selectedVisibleCount > 0 && presentVisibleCount - selectedPresentVisibleCount >= 1
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
          {displayedConfig.map((col) => {
            const isSelected = selected.has(col.id)
            const isMerged = col.sourceColumns.length > 1
            const isPresent = presentIds.has(col.id)

            return (
              <div
                key={col.id}
                {...dropTargetProps(col.id)}
                className={[
                  'col-settings__item',
                  dragOverId === col.id ? 'col-settings__item--drag-over' : '',
                  isSelected ? 'col-settings__item--selected' : '',
                  !col.visible ? 'col-settings__item--hidden' : '',
                  !isPresent ? 'col-settings__item--not-present' : '',
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
                  {!isPresent && <span className="col-settings__not-present-tag"> not loaded</span>}
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
            disabled={selected.size === displayedConfig.length}
            onClick={() => setSelected(new Set(displayedConfig.map((c) => c.id)))}
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
          {hasNotPresent && (
            <button
              type="button"
              className={[
                'col-settings__toggle-absent',
                showNotPresent ? 'col-settings__toggle-absent--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                const next = !showNotPresent
                setShowNotPresent(next)
                if (!next) {
                  setSelected((prev) => {
                    const cleaned = new Set(prev)
                    for (const id of prev) {
                      if (!presentIds.has(id)) cleaned.delete(id)
                    }
                    return cleaned
                  })
                }
              }}
            >
              {showNotPresent
                ? `Hide unloaded (${notPresentCount})`
                : `Show unloaded (${notPresentCount})`}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
