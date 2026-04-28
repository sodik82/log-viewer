import { useEffect, useRef, useState } from 'react'
import type { Column } from '@tanstack/react-table'
import type { LogEntry } from '../../types/log'
import { applyCellFilter, normalizeValue } from './filters/filterFunctions'

interface Props {
  value: unknown
  column: Column<LogEntry>
  filterType: 'text' | 'facet'
  children: React.ReactNode
  /** 'inline' renders as a span without overflow clipping, for use in detail panel key labels */
  variant?: 'inline'
}

export function CellFilterPopup({ value, column, filterType, children, variant }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  function handleTrigger() {
    if (open) {
      setOpen(false)
      return
    }
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen(true)
  }

  function handleFilter(mode: 'in' | 'out') {
    applyCellFilter(column, filterType, normalizeValue(value), mode)
    setOpen(false)
  }

  if (variant === 'inline') {
    return (
      <span className="log-table__cell-wrap log-table__cell-wrap--inline">
        {children}
        <button
          ref={triggerRef}
          type="button"
          className={`log-table__cell-filter-trigger${open ? ' log-table__cell-filter-trigger--active' : ''}`}
          onClick={handleTrigger}
          aria-label="Filter by this value"
        >
          ⊕
        </button>
        {open && (
          <div
            ref={popupRef}
            className="log-table__cell-filter-popup"
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 200 }}
          >
            <button type="button" onClick={() => handleFilter('in')}>
              = Filter In
            </button>
            <button type="button" onClick={() => handleFilter('out')}>
              ≠ Filter Out
            </button>
          </div>
        )}
      </span>
    )
  }

  return (
    <div className="log-table__cell-wrap">
      <div className="log-table__cell-text">{children}</div>
      <button
        ref={triggerRef}
        type="button"
        className={`log-table__cell-filter-trigger${open ? ' log-table__cell-filter-trigger--active' : ''}`}
        onClick={handleTrigger}
        aria-label="Filter by this value"
      >
        ⊕
      </button>
      {open && (
        <div
          ref={popupRef}
          className="log-table__cell-filter-popup"
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 200 }}
        >
          <button type="button" onClick={() => handleFilter('in')}>
            = Filter In
          </button>
          <button type="button" onClick={() => handleFilter('out')}>
            ≠ Filter Out
          </button>
        </div>
      )}
    </div>
  )
}
