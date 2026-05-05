import type { LoadedFile, ColumnMeta } from '../types/log'

const SKIP_KEYS = new Set(['_sourceFile', '_rawIndex'])
const PRIORITY_COLUMNS = ['level', 'severity', 'message', 'msg', 'error', 'service', 'logger']

// Five standard column widths, XS → XL
const WIDTH_XS = 80 // ≤ 8 chars  — level, boolean flags
const WIDTH_S = 130 // ≤ 20 chars — pod names, service names
const WIDTH_M = 200 // ≤ 50 chars — ISO timestamps, short identifiers
const WIDTH_L = 320 // ≤ 120 chars — log messages
const WIDTH_XL = 500 // > 120 chars — stack traces, long payloads

function pickWidth(maxLen: number): number {
  if (maxLen <= 8) return WIDTH_XS
  if (maxLen <= 20) return WIDTH_S
  if (maxLen <= 50) return WIDTH_M
  if (maxLen <= 120) return WIDTH_L
  return WIDTH_XL
}

function valueLength(val: unknown): number {
  if (val === null || val === undefined) return 0
  if (val instanceof Date) return 24 // toISOString() length
  if (typeof val === 'object') return Math.min(JSON.stringify(val).length, 200)
  return String(val).length
}

export function deriveColumns(files: LoadedFile[]): ColumnMeta[] {
  const maxLen = new Map<string, number>()

  const skipKeys = new Set(SKIP_KEYS)
  for (const file of files) {
    if (file.timestampField) skipKeys.add(file.timestampField)
  }

  for (const file of files) {
    for (const entry of file.entries) {
      for (const [key, val] of Object.entries(entry)) {
        if (skipKeys.has(key)) continue
        const len = valueLength(val)
        const prev = maxLen.get(key) ?? 0
        if (len > prev) maxLen.set(key, len)
      }
    }
  }

  const cols = Array.from(maxLen.keys()).filter((k) => k !== '_timestamp')

  cols.sort((a, b) => {
    const ai = PRIORITY_COLUMNS.indexOf(a)
    const bi = PRIORITY_COLUMNS.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b)
  })

  return ['_timestamp', ...cols].map((id) => ({
    id,
    // _timestamp always renders as ISO string (24 chars → M), even when all values are null
    width: id === '_timestamp' ? WIDTH_M : pickWidth(maxLen.get(id) ?? 0),
  }))
}
