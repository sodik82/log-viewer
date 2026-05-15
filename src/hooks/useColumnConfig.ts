import { useMemo, useState } from 'react'
import type { ColumnConfig, ColumnMeta } from '../types/log'
import { reorderColumns } from '../utils/reorderColumns'

const STORAGE_KEY = 'log-viewer:column-config'

function loadSaved(): ColumnConfig[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as unknown
    if (Array.isArray(raw)) return raw as ColumnConfig[]
  } catch {
    // ignore
  }
  return []
}

function persist(config: ColumnConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // ignore
  }
}

export function useColumnConfig(sourceColumns: ColumnMeta[]): {
  config: ColumnConfig[]
  presentIds: Set<string>
  reorder: (srcId: string, dstId: string) => void
  setVisible: (ids: string[], visible: boolean) => void
  merge: (ids: string[]) => void
  unmerge: (ids: string[]) => void
} {
  const [savedConfig, setSavedConfig] = useState<ColumnConfig[]>(loadSaved)

  const sourceWidths = useMemo(
    () => new Map(sourceColumns.map((s) => [s.id, s.width])),
    [sourceColumns]
  )

  // Effective config: saved entries + any source columns not yet tracked, appended at end.
  // Also refreshes widths for all configs using current source data.
  const { config, presentIds } = useMemo(() => {
    const activeSourceIds = new Set(sourceColumns.map((s) => s.id))
    const tracked = new Set(savedConfig.flatMap((c) => c.sourceColumns))
    const newEntries: ColumnConfig[] = sourceColumns
      .filter((s) => !tracked.has(s.id))
      .map((s) => ({
        id: s.id,
        displayName: s.id,
        visible: true,
        sourceColumns: [s.id],
        width: s.width,
      }))

    const allEntries = [...savedConfig, ...newEntries].map((c) => ({
      ...c,
      width: Math.max(100, ...c.sourceColumns.map((src) => sourceWidths.get(src) ?? c.width)),
    }))

    const ids = new Set(
      allEntries
        .filter((c) => c.sourceColumns.some((src) => activeSourceIds.has(src)))
        .map((c) => c.id)
    )

    return { config: allEntries, presentIds: ids }
  }, [savedConfig, sourceColumns, sourceWidths])

  function commit(next: ColumnConfig[]) {
    setSavedConfig(next)
    persist(next)
  }

  function reorder(srcId: string, dstId: string) {
    const ids = config.map((c) => c.id)
    const nextIds = reorderColumns(ids, srcId, dstId)
    const byId = new Map(config.map((c) => [c.id, c]))
    commit(nextIds.map((id) => byId.get(id)!))
  }

  function setVisible(ids: string[], visible: boolean) {
    const idSet = new Set(ids)
    commit(config.map((c) => (idSet.has(c.id) ? { ...c, visible } : c)))
  }

  function merge(ids: string[]) {
    const idSet = new Set(ids)
    // Collect configs in panel order
    const targets = config.filter((c) => idSet.has(c.id))
    if (targets.length < 2) return
    const [main, ...rest] = targets
    const mergedSources = targets.flatMap((c) => c.sourceColumns)
    const mergedWidth = Math.max(...mergedSources.map((src) => sourceWidths.get(src) ?? main.width))
    const merged: ColumnConfig = {
      ...main,
      sourceColumns: mergedSources,
      width: mergedWidth,
    }
    const restIds = new Set(rest.map((c) => c.id))
    // Replace main with merged, remove rest
    commit(config.map((c) => (c.id === main.id ? merged : c)).filter((c) => !restIds.has(c.id)))
  }

  function unmerge(ids: string[]) {
    const idSet = new Set(ids)
    const next: ColumnConfig[] = []
    for (const c of config) {
      if (idSet.has(c.id) && c.sourceColumns.length > 1) {
        // Expand into individual single-source configs
        for (const src of c.sourceColumns) {
          next.push({
            id: src,
            displayName: src,
            visible: c.visible,
            sourceColumns: [src],
            width: sourceWidths.get(src) ?? c.width,
          })
        }
      } else {
        next.push(c)
      }
    }
    commit(next)
  }

  return { config, presentIds, reorder, setVisible, merge, unmerge }
}
