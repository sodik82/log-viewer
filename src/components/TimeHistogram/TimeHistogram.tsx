import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import type { LogEntry } from '../../types/log'
import type { DateRangeFilterValue, DateRangePreset } from '../LogTable/filters/filterFunctions'
import { PRESET_OFFSETS } from '../LogTable/filters/filterFunctions'
import { computeBuckets } from '../../utils/histogramBuckets'
import './TimeHistogram.css'

const SVG_HEIGHT = 80
const AXIS_H = 16
const BAR_AREA_H = SVG_HEIGHT - AXIS_H
const TICK_COUNT = 5
const MIN_DRAG_PX = 3

interface Props {
  entries: LogEntry[]
  filterValue: DateRangeFilterValue | undefined
  onFilterChange: (value: DateRangeFilterValue | undefined) => void
}

function labelFormat(bucketMs: number): string {
  if (bucketMs < 60_000) return 'HH:mm:ss'
  if (bucketMs < 3_600_000) return 'HH:mm'
  if (bucketMs < 86_400_000) return 'MM/dd HH:mm'
  return 'MM/dd'
}

function resolveFilterRange(
  filterValue: DateRangeFilterValue | undefined
): { from: Date; to: Date } | null {
  if (!filterValue) return null
  if (filterValue.type === 'preset') {
    const to = new Date()
    const from = new Date(Date.now() - PRESET_OFFSETS[filterValue.preset as DateRangePreset])
    return { from, to }
  }
  if (filterValue.from || filterValue.to) {
    return {
      from: filterValue.from ?? new Date(0),
      to: filterValue.to ?? new Date(8640000000000000),
    }
  }
  return null
}

export function TimeHistogram({ entries, filterValue, onFilterChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(600)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragCurrent, setDragCurrent] = useState<number | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const activeRange = useMemo(() => resolveFilterRange(filterValue), [filterValue])
  const fullResult = useMemo(() => computeBuckets(entries), [entries])
  const result = useMemo(() => computeBuckets(entries, 50, activeRange), [entries, activeRange])

  const getMouseFraction = useCallback((clientX: number): number => {
    const el = wrapRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }, [])

  const fractionToDate = useCallback(
    (fraction: number): Date => {
      if (!result) return new Date()
      const visStart = result.buckets[0].start.getTime()
      const visEnd = result.buckets[result.buckets.length - 1].end.getTime()
      return new Date(visStart + fraction * (visEnd - visStart))
    },
    [result]
  )

  useEffect(() => {
    if (dragStart === null) return

    const onMove = (e: MouseEvent) => setDragCurrent(getMouseFraction(e.clientX))

    const onUp = (e: MouseEvent) => {
      const endFraction = getMouseFraction(e.clientX)
      const startFraction = dragStart
      const dragPx = Math.abs(endFraction - startFraction) * containerWidth

      if (dragPx >= MIN_DRAG_PX) {
        const lo = Math.min(startFraction, endFraction)
        const hi = Math.max(startFraction, endFraction)
        onFilterChange({ type: 'custom', from: fractionToDate(lo), to: fractionToDate(hi) })
      } else if (result) {
        const clickMs = fractionToDate(endFraction).getTime()
        const bucket = result.buckets.find(
          (b) => clickMs >= b.start.getTime() && clickMs < b.end.getTime()
        )
        if (bucket) {
          onFilterChange({ type: 'custom', from: bucket.start, to: bucket.end })
        }
      }

      setDragStart(null)
      setDragCurrent(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragStart, containerWidth, fractionToDate, getMouseFraction, onFilterChange, result])

  if (!fullResult) return null

  const hasFilter = activeRange !== null

  if (!result) {
    return (
      <div className="histogram-wrap" ref={wrapRef}>
        <button
          className="histogram__zoom-btn"
          type="button"
          onClick={() => onFilterChange(undefined)}
        >
          Reset zoom
        </button>
        <div className="histogram__no-data">No entries in selected range</div>
      </div>
    )
  }

  const { buckets, bucketMs } = result
  const visStart = buckets[0].start.getTime()
  const visEnd = buckets[buckets.length - 1].end.getTime()
  const visSpanMs = visEnd - visStart
  const maxCount = Math.max(...buckets.map((b) => b.count), 1)
  const fmt = labelFormat(bucketMs)

  const barWidth = containerWidth / buckets.length

  // brush overlay bounds
  const lo = dragStart !== null && dragCurrent !== null ? Math.min(dragStart, dragCurrent) : null
  const hi = dragStart !== null && dragCurrent !== null ? Math.max(dragStart, dragCurrent) : null

  // axis ticks
  const ticks: { x: number; label: string }[] = []
  for (let i = 0; i <= TICK_COUNT; i++) {
    const fraction = i / TICK_COUNT
    const ms = visStart + fraction * visSpanMs
    ticks.push({ x: fraction * containerWidth, label: format(new Date(ms), fmt) })
  }

  return (
    <div className="histogram-wrap" ref={wrapRef}>
      {hasFilter && (
        <button
          className="histogram__zoom-btn"
          type="button"
          onClick={() => onFilterChange(undefined)}
        >
          Reset zoom
        </button>
      )}
      <svg
        className="histogram-wrap__svg"
        height={SVG_HEIGHT}
        viewBox={`0 0 ${containerWidth} ${SVG_HEIGHT}`}
        preserveAspectRatio="none"
        onMouseDown={(e) => {
          e.preventDefault()
          setDragStart(getMouseFraction(e.clientX))
          setDragCurrent(getMouseFraction(e.clientX))
        }}
      >
        {buckets.map((bucket, i) => {
          const x = i * barWidth
          const isZero = bucket.count === 0
          const barH = (bucket.count / maxCount) * BAR_AREA_H
          const y = BAR_AREA_H - barH
          return (
            <rect
              key={i}
              className={isZero ? 'histogram__bar--zero' : 'histogram__bar'}
              x={x + 0.5}
              y={y}
              width={Math.max(barWidth - 1, 1)}
              height={Math.max(barH, 1)}
            >
              <title>
                {bucket.count} entries · {format(bucket.start, fmt)} – {format(bucket.end, fmt)}
              </title>
            </rect>
          )
        })}

        {lo !== null && hi !== null && (
          <rect
            className="histogram__brush"
            x={lo * containerWidth}
            y={0}
            width={(hi - lo) * containerWidth}
            height={BAR_AREA_H}
          />
        )}

        {ticks.map(({ x, label }, i) => (
          <text
            key={i}
            className="histogram__axis-label"
            x={Math.min(x, containerWidth - 2)}
            y={SVG_HEIGHT - 3}
            textAnchor={i === 0 ? 'start' : i === TICK_COUNT ? 'end' : 'middle'}
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  )
}
