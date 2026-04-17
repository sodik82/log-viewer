import { useMemo } from 'react'
import type { LoadedFile, LogEntry } from '../types/log'
import { deriveColumns } from '../utils/columnDeriver'

export function useLogTable(files: LoadedFile[]) {
  const columnIds = useMemo(() => deriveColumns(files), [files])
  const allEntries = useMemo(() => files.flatMap((f) => f.entries), [files])

  const sorted = useMemo(() => {
    return [...allEntries].sort((a, b) => {
      if (a._timestamp === null && b._timestamp === null) return compareBySource(a, b)
      if (a._timestamp === null) return 1
      if (b._timestamp === null) return -1
      const diff = a._timestamp.getTime() - b._timestamp.getTime()
      if (diff !== 0) return diff
      return compareBySource(a, b)
    })
  }, [allEntries])

  const hasNoTimestamp = files.length > 0 && allEntries.every((e) => e._timestamp === null)

  return { sorted, columnIds, hasNoTimestamp }
}

function compareBySource(a: LogEntry, b: LogEntry): number {
  const sf = a._sourceFile.localeCompare(b._sourceFile)
  if (sf !== 0) return sf
  return a._rawIndex - b._rawIndex
}
