import type { LoadedFile } from '../types/log'

const INTERNAL_KEYS = new Set(['_timestamp', '_sourceFile', '_rawIndex'])
const PRIORITY_COLUMNS = ['level', 'severity', 'message', 'msg', 'error', 'service', 'logger']

export function deriveColumns(files: LoadedFile[]): string[] {
  const seen = new Set<string>()

  for (const file of files) {
    for (const entry of file.entries) {
      for (const key of Object.keys(entry)) {
        if (!INTERNAL_KEYS.has(key)) {
          seen.add(key)
        }
      }
    }
  }

  const cols = Array.from(seen)

  cols.sort((a, b) => {
    const ai = PRIORITY_COLUMNS.indexOf(a)
    const bi = PRIORITY_COLUMNS.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b)
  })

  return ['_timestamp', ...cols]
}
