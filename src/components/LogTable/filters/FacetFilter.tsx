import { useState, useRef, useEffect } from 'react'
import type { Column } from '@tanstack/react-table'
import type { LogEntry } from '../../../types/log'
import type { TextFilterValue } from './filterFunctions'

interface Props {
  column: Column<LogEntry, unknown>
}

export function FacetFilter({ column }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const filterValue = column.getFilterValue() as TextFilterValue | undefined
  const inputText = filterValue?.value ?? ''

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const facetMap = column.getFacetedUniqueValues()
  const options = Array.from(facetMap.entries())
    .filter(([k]) => {
      const s = String(k)
      return s !== '' && s.toLowerCase().includes(inputText.toLowerCase())
    })
    .map(([k, count]) => ({ label: String(k), count }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(0, 50)

  function handleInput(value: string) {
    setOpen(true)
    column.setFilterValue(
      value ? ({ operator: 'contains', value } satisfies TextFilterValue) : undefined
    )
  }

  function handleSelect(value: string) {
    column.setFilterValue({ operator: 'equals', value } satisfies TextFilterValue)
    setOpen(false)
  }

  function handleClear() {
    column.setFilterValue(undefined)
    setOpen(false)
  }

  return (
    <div className="log-filter log-filter--facet" ref={wrapRef}>
      <div className="log-filter__facet-input-wrap">
        <input
          className="log-filter__input"
          type="text"
          placeholder="filter…"
          value={inputText}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        {inputText && (
          <button className="log-filter__clear-btn" onClick={handleClear} type="button">
            ×
          </button>
        )}
      </div>
      {open && options.length > 0 && (
        <ul className="log-filter__facet-list">
          {options.map(({ label, count }) => (
            <li
              key={label}
              className={`log-filter__facet-item${filterValue?.value === label ? ' log-filter__facet-item--active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(label)
              }}
            >
              <span>{label}</span>
              <span className="log-filter__facet-count">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
