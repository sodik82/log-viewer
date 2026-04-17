import { useState } from 'react'
import type { Column } from '@tanstack/react-table'
import type { LogEntry } from '../../../types/log'
import type { TextFilterValue } from './filterFunctions'

interface Props {
  column: Column<LogEntry, unknown>
}

export function TextFilter({ column }: Props) {
  const filterValue = (column.getFilterValue() as TextFilterValue) ?? {
    operator: 'contains' as const,
    value: '',
  }
  const [invalidRegex, setInvalidRegex] = useState(false)

  function handleOperatorChange(operator: TextFilterValue['operator']) {
    setInvalidRegex(false)
    column.setFilterValue(filterValue.value ? { operator, value: filterValue.value } : undefined)
  }

  function handleValueChange(value: string) {
    if (filterValue.operator === 'regex') {
      try {
        new RegExp(value)
        setInvalidRegex(false)
      } catch {
        setInvalidRegex(true)
      }
    }
    column.setFilterValue(value ? { operator: filterValue.operator, value } : undefined)
  }

  return (
    <div className="log-filter log-filter--text">
      <select
        className="log-filter__op"
        value={filterValue.operator}
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
        value={filterValue.value}
        onChange={(e) => handleValueChange(e.target.value)}
      />
    </div>
  )
}
