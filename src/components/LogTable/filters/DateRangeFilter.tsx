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
      return
    }
    const newFrom = range.from ? applyTime(range.from, from ? toTimeStr(from) : '00:00:00') : null
    const newTo = range.to ? applyTime(range.to, to ? toTimeStr(to) : '23:59:59') : null
    column.setFilterValue(newFrom || newTo ? [newFrom, newTo] : undefined)
  }

  const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/

  function handleTimeChange(which: 'from' | 'to', timeStr: string) {
    if (!TIME_RE.test(timeStr)) return
    if (which === 'from' && from) setFilter(applyTime(from, timeStr), to)
    if (which === 'to' && to) setFilter(from, applyTime(to, timeStr))
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    column.setFilterValue(undefined)
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
                className="log-filter__time-input"
                type="text"
                value={from ? toTimeStr(from) : '00:00:00'}
                disabled={!from}
                placeholder="HH:MM:SS"
                pattern="[0-2][0-9]:[0-5][0-9]:[0-5][0-9]"
                onChange={(e) => handleTimeChange('from', e.target.value)}
              />
            </label>
            <label className="log-filter__time-label">
              To
              <input
                className="log-filter__time-input"
                type="text"
                value={to ? toTimeStr(to) : '23:59:59'}
                disabled={!to}
                placeholder="HH:MM:SS"
                pattern="[0-2][0-9]:[0-5][0-9]:[0-5][0-9]"
                onChange={(e) => handleTimeChange('to', e.target.value)}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
