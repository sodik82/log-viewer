import { useState, useRef, useEffect } from 'react'
import type { Column } from '@tanstack/react-table'
import type { LogEntry } from '../../../types/log'
import {
  normalizeValue,
  DEBOUNCE_MS,
  tryCompileRegex,
  textFilterTriggerLabel,
  type FacetFilterValue,
  type TextFilterValue,
} from './filterFunctions'
import { FilterTrigger, TextOpOptions } from './FilterTrigger'

type CombinedMode = FacetFilterValue['mode'] | TextFilterValue['operator']

interface Props {
  column: Column<LogEntry, unknown>
}

function isFacetMode(mode: CombinedMode): mode is FacetFilterValue['mode'] {
  return mode === 'include' || mode === 'exclude'
}

function initMode(filterValue: FacetFilterValue | TextFilterValue | undefined): CombinedMode {
  if (!filterValue) return 'include'
  if ('operator' in filterValue) return filterValue.operator
  return filterValue.mode
}

export function FacetFilter({ column }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const filterValue = column.getFilterValue() as FacetFilterValue | TextFilterValue | undefined

  const [localMode, setLocalMode] = useState<CombinedMode>(() => initMode(filterValue))
  const [localTextValue, setLocalTextValue] = useState<string>(() => {
    if (filterValue && 'operator' in filterValue) return filterValue.value
    return ''
  })
  const [localNegate, setLocalNegate] = useState<boolean>(() => {
    if (filterValue && 'operator' in filterValue) return filterValue.negate
    return false
  })
  const [invalidRegex, setInvalidRegex] = useState(false)
  const [reDoSWarning, setReDoSWarning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const compiledRegexRef = useRef<RegExp | undefined>(undefined)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  // Cancel in-flight debounce when filter is cleared externally (no setState, only clearTimeout)
  useEffect(() => {
    if (!filterValue && timerRef.current) clearTimeout(timerRef.current)
  }, [filterValue])

  // Reset all local state when filter is cleared externally.
  // This is React's documented pattern for "storing info from previous renders".
  const [prevFilterExists, setPrevFilterExists] = useState(!!filterValue)
  if (prevFilterExists !== !!filterValue) {
    setPrevFilterExists(!!filterValue)
    if (!filterValue) {
      setLocalTextValue('')
      setInvalidRegex(false)
      setReDoSWarning(false)
    }
  }

  // For text mode: also reset text value when it's cleared externally without full filter removal.
  const [prevTextCommitted, setPrevTextCommitted] = useState<string | undefined>(() => {
    if (filterValue && 'operator' in filterValue) return filterValue.value
    return undefined
  })
  const currentTextCommitted =
    filterValue && 'operator' in filterValue ? filterValue.value : undefined
  if (prevTextCommitted !== currentTextCommitted) {
    setPrevTextCommitted(currentTextCommitted)
    if (!currentTextCommitted) {
      setLocalTextValue('')
      setInvalidRegex(false)
      setReDoSWarning(false)
    }
  }

  // Derived state
  const facetFilter =
    filterValue && !('operator' in filterValue) ? (filterValue as FacetFilterValue) : undefined
  const selectedValues = facetFilter?.values ?? []
  const textNegate = filterValue && 'operator' in filterValue ? filterValue.negate : localNegate
  const textOperator = !isFacetMode(localMode)
    ? (localMode as TextFilterValue['operator'])
    : 'contains'

  // Facet options list
  const facetMap = column.getFacetedUniqueValues()
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

  function setFacetFilter(newMode: FacetFilterValue['mode'], newValues: string[]) {
    column.setFilterValue(newValues.length > 0 ? { mode: newMode, values: newValues } : undefined)
  }

  function handleToggleValue(value: string) {
    const facetMode = localMode as FacetFilterValue['mode']
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value]
    setFacetFilter(facetMode, newValues)
  }

  function applyTextFilter(val: string, op: TextFilterValue['operator'], neg: boolean) {
    if (!val) {
      column.setFilterValue(undefined)
      return
    }
    column.setFilterValue({
      operator: op,
      negate: neg,
      value: val,
      compiledRegex: op === 'regex' ? compiledRegexRef.current : undefined,
    })
  }

  function handleModeChange(newMode: CombinedMode) {
    const wasText = !isFacetMode(localMode)
    const isText = !isFacetMode(newMode)
    if (timerRef.current) clearTimeout(timerRef.current)

    if (wasText !== isText) {
      // Switching between filter types: clear filter value and reset text state
      column.setFilterValue(undefined)
      setLocalTextValue('')
      setInvalidRegex(false)
      setReDoSWarning(false)
    } else if (isFacetMode(newMode) && selectedValues.length > 0) {
      // Switching include ↔ exclude with existing selections
      setFacetFilter(newMode as FacetFilterValue['mode'], selectedValues)
    } else if (!isFacetMode(newMode) && localTextValue) {
      // Switching between text operators with existing text
      const op = newMode as TextFilterValue['operator']
      setInvalidRegex(false)
      setReDoSWarning(false)
      if (op === 'regex') {
        const result = tryCompileRegex(localTextValue)
        if (!result.ok) {
          if (result.error === 'redos') setReDoSWarning(true)
          else setInvalidRegex(true)
          setLocalMode(newMode)
          return
        }
        compiledRegexRef.current = result.regex
      }
      applyTextFilter(localTextValue, op, textNegate)
    }

    setLocalMode(newMode)
  }

  function handleTextValueChange(newValue: string) {
    setLocalTextValue(newValue)
    setInvalidRegex(false)
    setReDoSWarning(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (!newValue) {
        column.setFilterValue(undefined)
        return
      }
      if (textOperator === 'regex') {
        const result = tryCompileRegex(newValue)
        if (!result.ok) {
          if (result.error === 'redos') setReDoSWarning(true)
          else setInvalidRegex(true)
          return
        }
        compiledRegexRef.current = result.regex
      }
      applyTextFilter(newValue, textOperator, textNegate)
    }, DEBOUNCE_MS)
  }

  function handleNegateToggle() {
    if (timerRef.current) clearTimeout(timerRef.current)
    const newNegate = !textNegate
    setLocalNegate(newNegate)
    if (!localTextValue) return
    if (textOperator === 'regex') {
      const result = tryCompileRegex(localTextValue)
      if (!result.ok) {
        if (result.error === 'redos') setReDoSWarning(true)
        else setInvalidRegex(true)
        return
      }
      compiledRegexRef.current = result.regex
      setInvalidRegex(false)
    }
    applyTextFilter(localTextValue, textOperator, newNegate)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    column.setFilterValue(undefined)
    setSearch('')
    setOpen(false)
  }

  function getTriggerLabel(): string {
    if (!filterValue) return '(any value)'
    if ('operator' in filterValue) return textFilterTriggerLabel(filterValue as TextFilterValue)
    const fv = filterValue as FacetFilterValue
    return `${fv.mode === 'exclude' ? 'NOT IN' : 'IN'} [${fv.values.map((v) => (v === '' ? '(unset)' : v)).join(', ')}]`
  }

  const hasError = invalidRegex || reDoSWarning
  const errorTitle = reDoSWarning
    ? 'Pattern may cause catastrophic backtracking — simplify the regex'
    : undefined

  return (
    <div className="log-filter log-filter--facet" ref={wrapRef}>
      <FilterTrigger
        label={getTriggerLabel()}
        active={!!filterValue}
        onToggle={() => setOpen((v) => !v)}
        onClear={handleClear}
      />
      {open && (
        <div className="log-filter__facet-popover">
          <div className="log-filter__facet-popover-header">
            <select
              className="log-filter__op"
              value={localMode}
              onChange={(e) => handleModeChange(e.target.value as CombinedMode)}
            >
              <optgroup label="Value list">
                <option value="include">Include</option>
                <option value="exclude">Exclude</option>
              </optgroup>
              <optgroup label="Text search">
                <TextOpOptions />
              </optgroup>
            </select>
            {isFacetMode(localMode) ? (
              <input
                className="log-filter__input log-filter__facet-search"
                type="text"
                placeholder="search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            ) : (
              <button
                className={`log-filter__not-btn${textNegate ? ' log-filter__not-btn--active' : ''}`}
                onClick={handleNegateToggle}
                type="button"
              >
                NOT
              </button>
            )}
          </div>
          {isFacetMode(localMode) ? (
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
          ) : (
            <div className="log-filter__text-body">
              <input
                className={`log-filter__input${hasError ? ' log-filter__input--error' : ''}`}
                type="text"
                placeholder="filter…"
                value={localTextValue}
                onChange={(e) => handleTextValueChange(e.target.value)}
                title={errorTitle}
                autoFocus
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
