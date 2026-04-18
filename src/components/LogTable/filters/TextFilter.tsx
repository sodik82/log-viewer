import { useState } from 'react'
import type { Column } from '@tanstack/react-table'
import type { LogEntry } from '../../../types/log'
import type { TextFilterValue } from './filterFunctions'

interface Props {
  column: Column<LogEntry, unknown>
}

export function TextFilter({ column }: Props) {
  const filterValue = column.getFilterValue() as TextFilterValue | undefined
  const [localNegate, setLocalNegate] = useState(false)
  const [invalidRegex, setInvalidRegex] = useState(false)

  const operator = filterValue?.operator ?? 'contains'
  const value = filterValue?.value ?? ''
  const negate = filterValue?.negate ?? localNegate

  function handleOperatorChange(op: TextFilterValue['operator']) {
    setInvalidRegex(false)
    if (value) column.setFilterValue({ operator: op, negate, value })
  }

  function handleValueChange(newValue: string) {
    if (operator === 'regex') {
      try {
        new RegExp(newValue)
        setInvalidRegex(false)
      } catch {
        setInvalidRegex(true)
      }
    }
    column.setFilterValue(newValue ? { operator, negate, value: newValue } : undefined)
  }

  function handleNegateToggle() {
    const newNegate = !negate
    setLocalNegate(newNegate)
    if (value) column.setFilterValue({ operator, negate: newNegate, value })
  }

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
        className={`log-filter__input${invalidRegex ? ' log-filter__input--error' : ''}`}
        type="text"
        placeholder="filter…"
        value={value}
        onChange={(e) => handleValueChange(e.target.value)}
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
