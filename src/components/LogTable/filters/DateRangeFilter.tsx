import { useState, useRef, useEffect } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import type { Column } from '@tanstack/react-table'
import type { LogEntry } from '../../../types/log'
import type { DateRangeFilterValue } from './filterFunctions'
import 'react-day-picker/style.css'

interface Props {
  column: Column<LogEntry, unknown>
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/

function toTimeStr(d: Date): string {
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}

function applyTime(date: Date, timeStr: string): Date {
  const [h, m, s] = timeStr.split(':').map(Number)
  const result = new Date(date)
  result.setHours(h ?? 0, m ?? 0, s ?? 0, 0)
  return result
}

export function DateRangeFilter({ column }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const filterValue = column.getFilterValue() as DateRangeFilterValue | undefined
  const from = filterValue?.[0] ?? undefined
  const to = filterValue?.[1] ?? undefined

  // Local text state so the user can type freely; only committed when valid
  const [fromTime, setFromTime] = useState(() => (from ? toTimeStr(from) : '00:00:00'))
  const [toTime, setToTime] = useState(() => (to ? toTimeStr(to) : '23:59:59'))

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function setFilter(newFrom: Date | null | undefined, newTo: Date | null | undefined) {
    const f = newFrom ?? null
    const t = newTo ?? null
    column.setFilterValue(f || t ? [f, t] : undefined)
  }

  function handleSelect(range: DateRange | undefined) {
    if (!range?.from && !range?.to) {
      column.setFilterValue(undefined)
      setFromTime('00:00:00')
      setToTime('23:59:59')
      return
    }
    // Preserve existing time strings when extending / changing dates
    const newFrom = range.from ? applyTime(range.from, fromTime) : null
    const newTo = range.to ? applyTime(range.to, toTime) : null
    column.setFilterValue(newFrom || newTo ? [newFrom, newTo] : undefined)
  }

  function handleFromTimeChange(value: string) {
    setFromTime(value)
    if (TIME_RE.test(value) && from) setFilter(applyTime(from, value), to)
  }

  function handleToTimeChange(value: string) {
    setToTime(value)
    if (TIME_RE.test(value) && to) setFilter(from, applyTime(to, value))
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    column.setFilterValue(undefined)
    setFromTime('00:00:00')
    setToTime('23:59:59')
    setOpen(false)
  }

  const label =
    from || to
      ? `${from ? format(from, 'MM/dd HH:mm:ss') : '…'} – ${to ? format(to, 'MM/dd HH:mm:ss') : '…'}`
      : 'date/time range…'

  return (
    <div className="log-filter log-filter--date" ref={wrapRef}>
      <button
        className={`log-filter__date-btn${from || to ? ' log-filter__date-btn--active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {label}
        {(from || to) && (
          <span className="log-filter__date-clear" onClick={handleClear}>
            ×
          </span>
        )}
      </button>
      {open && (
        <div className="log-filter__date-popover">
          <DayPicker
            mode="range"
            selected={{ from, to }}
            onSelect={handleSelect}
            weekStartsOn={1}
          />
          <div className="log-filter__time-row">
            <label className="log-filter__time-label">
              From
              <input
                className={`log-filter__time-input${!TIME_RE.test(fromTime) ? ' log-filter__input--error' : ''}`}
                type="text"
                value={fromTime}
                disabled={!from}
                placeholder="HH:MM:SS"
                onChange={(e) => handleFromTimeChange(e.target.value)}
              />
            </label>
            <label className="log-filter__time-label">
              To
              <input
                className={`log-filter__time-input${!TIME_RE.test(toTime) ? ' log-filter__input--error' : ''}`}
                type="text"
                value={toTime}
                disabled={!to}
                placeholder="HH:MM:SS"
                onChange={(e) => handleToTimeChange(e.target.value)}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
