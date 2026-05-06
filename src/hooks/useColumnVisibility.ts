import { useState } from 'react'

const STORAGE_KEY = 'log-viewer:column-visibility'

export function useColumnVisibility(): {
  columnVisibility: Record<string, boolean>
  setColumnVisibility: (vis: Record<string, boolean>) => void
} {
  const [columnVisibility, setVisibilityState] = useState<Record<string, boolean>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as unknown
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        return saved as Record<string, boolean>
      }
    } catch {
      // ignore
    }
    return {}
  })

  const setColumnVisibility = (vis: Record<string, boolean>) => {
    setVisibilityState(vis)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vis))
    } catch {
      // ignore
    }
  }

  return { columnVisibility, setColumnVisibility }
}
