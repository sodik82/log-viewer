import { useState, useRef, useEffect } from 'react'
import type { Column } from '@tanstack/react-table'
import type { LogEntry } from '../../../types/log'
import { normalizeValue, type FacetFilterValue } from './filterFunctions'

interface Props {
  column: Column<LogEntry, unknown>
}

export function FacetFilter({ column }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const filterValue = column.getFilterValue() as FacetFilterValue | undefined

  const mode = filterValue?.mode ?? 'include'
  const selectedValues = filterValue?.values ?? []

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const facetMap = column.getFacetedUniqueValues()

  // Normalize all keys and merge undefined/null/'' into a single (unset) bucket
  const normalized = new Map<string, number>()
  for (const [k, count] of facetMap.entries()) {
    const val = normalizeValue(k)
    normalized.set(val, (normalized.get(val) ?? 0) + count)
  }

  const lowerSearch = search.toLowerCase()
  const options = Array.from(normalized.entries())
    .filter(([val]) => {
      const display = val === '' ? '(unset)' : val
      return display.toLowerCase().includes(lowerSearch)
    })
    .map(([val, count]) => ({ label: val === '' ? '(unset)' : val, value: val, count }))
    .sort((a, b) => {
      if (a.value === '') return 1
      if (b.value === '') return -1
      return a.label.localeCompare(b.label)
    })
    .slice(0, 50)

  function setFilter(newMode: 'include' | 'exclude', newValues: string[]) {
    column.setFilterValue(newValues.length > 0 ? { mode: newMode, values: newValues } : undefined)
  }

  function handleModeChange(newMode: 'include' | 'exclude') {
    setFilter(newMode, selectedValues)
  }

  function handleToggleValue(value: string) {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value]
    setFilter(mode, newValues)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    column.setFilterValue(undefined)
    setSearch('')
    setOpen(false)
  }

  const triggerLabel = filterValue
    ? `${filterValue.mode === 'exclude' ? 'NOT IN' : 'IN'} [${filterValue.values.map((v) => (v === '' ? '(unset)' : v)).join(', ')}]`
    : '(any value)'

  return (
    <div className="log-filter log-filter--facet" ref={wrapRef}>
      <div className="log-filter__facet-trigger-wrap">
        <button
          className={`log-filter__facet-trigger${filterValue ? ' log-filter__facet-trigger--active' : ''}`}
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          {triggerLabel}
        </button>
        {filterValue && (
          <button className="log-filter__clear-btn" onClick={handleClear} type="button">
            ×
          </button>
        )}
      </div>
      {open && (
        <div className="log-filter__facet-popover">
          <div className="log-filter__facet-popover-header">
            <select
              className="log-filter__op"
              value={mode}
              onChange={(e) => handleModeChange(e.target.value as 'include' | 'exclude')}
            >
              <option value="include">Include</option>
              <option value="exclude">Exclude</option>
            </select>
            <input
              className="log-filter__input log-filter__facet-search"
              type="text"
              placeholder="search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ul className="log-filter__facet-list">
            {options.map(({ label, value, count }) => (
              <li
                key={value === '' ? '\x00unset' : value}
                className={`log-filter__facet-item${value === '' ? ' log-filter__facet-item--unset' : ''}${selectedValues.includes(value) ? ' log-filter__facet-item--checked' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleToggleValue(value)
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(value)}
                  onChange={() => handleToggleValue(value)}
                  className="log-filter__facet-checkbox"
                />
                <span>{label}</span>
                <span className="log-filter__facet-count">{count}</span>
              </li>
            ))}
            {options.length === 0 && <li className="log-filter__facet-empty">No values match</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
