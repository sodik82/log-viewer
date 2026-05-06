import { useMemo, useState } from 'react'
import type { ColumnMeta } from '../types/log'

const STORAGE_KEY = 'log-viewer:column-order'

function mergeOrder(saved: string[], current: string[]): string[] {
  const currentSet = new Set(current)
  const ordered = saved.filter((id) => currentSet.has(id))
  const orderedSet = new Set(ordered)
  return [...ordered, ...current.filter((id) => !orderedSet.has(id))]
}

export function useColumnOrder(columnMetas: ColumnMeta[]): {
  columnOrder: string[]
  setColumnOrder: (order: string[]) => void
} {
  const [savedOrder, setSavedOrder] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as string[] | null
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })

  const columnOrder = useMemo(() => {
    const currentIds = columnMetas.map((m) => m.id)
    return savedOrder.length > 0 ? mergeOrder(savedOrder, currentIds) : currentIds
  }, [savedOrder, columnMetas])

  const setColumnOrder = (order: string[]) => {
    setSavedOrder(order)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
    } catch {
      // ignore
    }
  }

  return { columnOrder, setColumnOrder }
}
