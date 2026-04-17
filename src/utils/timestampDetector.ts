const ISO_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/
const KIBANA_RE = /^[A-Za-z]{3} \d{1,2}, \d{4} @ \d{2}:\d{2}:\d{2}/
const KIBANA_MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
}
const MS_EPOCH_MIN = 1_000_000_000_000
const MS_EPOCH_MAX = 9_999_999_999_999

const PRIORITY_NAMES = [
  'timestamp',
  'time',
  '@timestamp',
  'ts',
  'date',
  'datetime',
  'created_at',
  'updated_at',
]

function isTimestampValue(val: unknown): boolean {
  if (typeof val === 'string') {
    if (ISO_RE.test(val)) {
      const d = new Date(val)
      return !isNaN(d.getTime())
    }
    return KIBANA_RE.test(val)
  }
  if (typeof val === 'number') {
    return val >= MS_EPOCH_MIN && val <= MS_EPOCH_MAX
  }
  return false
}

export function detectTimestampField(entries: Record<string, unknown>[]): string | null {
  if (entries.length === 0) return null

  const sample = entries.slice(0, 20)

  const fieldHits = new Map<string, number>()
  const fieldTotal = new Map<string, number>()

  for (const entry of sample) {
    for (const [key, val] of Object.entries(entry)) {
      if (key.startsWith('_')) continue
      if (val !== null && val !== undefined) {
        fieldTotal.set(key, (fieldTotal.get(key) ?? 0) + 1)
        if (isTimestampValue(val)) {
          fieldHits.set(key, (fieldHits.get(key) ?? 0) + 1)
        }
      }
    }
  }

  const candidates: string[] = []
  for (const [field, hits] of fieldHits) {
    const total = fieldTotal.get(field) ?? 1
    if (hits / total >= 0.8) {
      candidates.push(field)
    }
  }

  if (candidates.length === 0) return null

  candidates.sort((a, b) => {
    const ai = PRIORITY_NAMES.indexOf(a.toLowerCase())
    const bi = PRIORITY_NAMES.indexOf(b.toLowerCase())
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    const aHits = fieldHits.get(a) ?? 0
    const bHits = fieldHits.get(b) ?? 0
    if (bHits !== aHits) return bHits - aHits
    return a.localeCompare(b)
  })

  return candidates[0] ?? null
}

function parseKibanaTimestamp(val: string): Date | null {
  const m = val.match(/^([A-Za-z]{3}) (\d{1,2}), (\d{4}) @ (\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/)
  if (!m) return null
  const monthIdx = KIBANA_MONTHS[m[1]]
  if (monthIdx === undefined) return null
  const ms = m[7] ? parseInt(m[7].padEnd(3, '0').slice(0, 3), 10) : 0
  return new Date(Date.UTC(+m[3], monthIdx, +m[2], +m[4], +m[5], +m[6], ms))
}

export function parseTimestampValue(val: unknown): Date | null {
  if (typeof val === 'string') {
    if (KIBANA_RE.test(val)) return parseKibanaTimestamp(val)
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof val === 'number') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}
