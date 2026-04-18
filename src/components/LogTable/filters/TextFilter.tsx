import { useState, useEffect, useRef } from 'react'
import type { Column } from '@tanstack/react-table'
import type { LogEntry } from '../../../types/log'
import { isReDoSRisk, type TextFilterValue } from './filterFunctions'

interface Props {
  column: Column<LogEntry, unknown>
}

const DEBOUNCE_MS = 150

export function TextFilter({ column }: Props) {
  const filterValue = column.getFilterValue() as TextFilterValue | undefined
  const [localNegate, setLocalNegate] = useState(false)
  const [localInputValue, setLocalInputValue] = useState(filterValue?.value ?? '')
  const [invalidRegex, setInvalidRegex] = useState(false)
  const [reDoSWarning, setReDoSWarning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const compiledRegexRef = useRef<RegExp | undefined>(undefined)

  // Track previous committed value using state so we can derive resets without refs or effects.
  // This is React's documented pattern for "storing info from previous renders":
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevCommitted, setPrevCommitted] = useState(filterValue?.value)
  const currentCommitted = filterValue?.value
  if (prevCommitted !== currentCommitted) {
    setPrevCommitted(currentCommitted)
    if (!currentCommitted) {
      setLocalInputValue('')
      setInvalidRegex(false)
      setReDoSWarning(false)
    }
  }

  // Cancel in-flight debounce when filter is cleared externally (no setState, only clearTimeout)
  useEffect(() => {
    if (!filterValue && timerRef.current) clearTimeout(timerRef.current)
  }, [filterValue])

  // Cancel pending debounce on unmount
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  const operator = filterValue?.operator ?? 'contains'
  const negate = filterValue?.negate ?? localNegate

  function applyFilter(val: string, op: TextFilterValue['operator'], neg: boolean) {
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

  function handleOperatorChange(op: TextFilterValue['operator']) {
    // Cancel in-flight debounce to avoid overwriting with stale operator
    if (timerRef.current) clearTimeout(timerRef.current)
    setInvalidRegex(false)
    setReDoSWarning(false)
    if (op === 'regex' && localInputValue) {
      if (isReDoSRisk(localInputValue)) {
        setReDoSWarning(true)
        return
      }
      try {
        compiledRegexRef.current = new RegExp(localInputValue, 'i')
      } catch {
        setInvalidRegex(true)
        return
      }
    }
    if (localInputValue) applyFilter(localInputValue, op, negate)
  }

  function handleValueChange(newValue: string) {
    setLocalInputValue(newValue)
    setInvalidRegex(false)
    setReDoSWarning(false)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (!newValue) {
        column.setFilterValue(undefined)
        return
      }
      if (operator === 'regex') {
        if (isReDoSRisk(newValue)) {
          setReDoSWarning(true)
          return
        }
        try {
          compiledRegexRef.current = new RegExp(newValue, 'i')
        } catch {
          setInvalidRegex(true)
          return
        }
      }
      applyFilter(newValue, operator, negate)
    }, DEBOUNCE_MS)
  }

  function handleNegateToggle() {
    // Cancel in-flight debounce to avoid overwriting with stale negate
    if (timerRef.current) clearTimeout(timerRef.current)
    const newNegate = !negate
    setLocalNegate(newNegate)
    if (localInputValue) applyFilter(localInputValue, operator, newNegate)
  }

  const hasError = invalidRegex || reDoSWarning
  const errorTitle = reDoSWarning
    ? 'Pattern may cause catastrophic backtracking — simplify the regex'
    : undefined

  return (
    <div className="log-filter log-filter--text">
      <select
        className="log-filter__op"
        value={operator}
        onChange={(e) => handleOperatorChange(e.target.value as TextFilterValue['operator'])}
        title="filter operator"
      >
        <option value="contains">~</option>
        <option value="equals">=</option>
        <option value="regex">.*</option>
      </select>
      <input
        className={`log-filter__input${hasError ? ' log-filter__input--error' : ''}`}
        type="text"
        placeholder="filter…"
        value={localInputValue}
        onChange={(e) => handleValueChange(e.target.value)}
        title={errorTitle}
      />
      <button
        className={`log-filter__not-btn${negate ? ' log-filter__not-btn--active' : ''}`}
        onClick={handleNegateToggle}
        type="button"
        title="negate filter"
      >
        NOT
      </button>
    </div>
  )
}
