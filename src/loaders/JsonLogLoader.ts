import type { ILogLoader, ParseResult } from '../types/log'
import { detectTimestampField, parseTimestampValue } from '../utils/timestampDetector'

export class JsonLogLoader implements ILogLoader {
  readonly name = 'JSON / NDJSON'

  isSupported(ext: string, contentHint: string): boolean {
    if (ext === '.json' || ext === '.ndjson') return true
    if (ext === '.log') {
      const first = contentHint.trimStart()[0]
      return first === '[' || first === '{'
    }
    return false
  }

  parse(content: string, fileName: string): ParseResult {
    const trimmed = content.trim()
    if (!trimmed) return { entries: [], timestampField: null }

    const rawObjects = (
      trimmed.startsWith('[') ? this.parseArray(trimmed) : this.parseNdjson(trimmed)
    ).map((obj) => this.flatten(obj))

    if (rawObjects.length === 0) return { entries: [], timestampField: null }

    const tsField = detectTimestampField(rawObjects)

    const entries = rawObjects.map((obj, i) => ({
      ...obj,
      _timestamp: tsField ? parseTimestampValue(obj[tsField]) : null,
      _sourceFile: fileName,
      _rawIndex: i,
    }))

    return { entries, timestampField: tsField }
  }

  private parseArray(content: string): Record<string, unknown>[] {
    try {
      const parsed = JSON.parse(content)
      if (!Array.isArray(parsed)) return []
      return parsed.filter(
        (el) => typeof el === 'object' && el !== null && !Array.isArray(el)
      ) as Record<string, unknown>[]
    } catch {
      return []
    }
  }

  private flatten(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        Object.assign(result, this.flatten(val as Record<string, unknown>, fullKey))
      } else {
        result[fullKey] = val
      }
    }
    return result
  }

  private parseNdjson(content: string): Record<string, unknown>[] {
    const results: Record<string, unknown>[] = []
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const parsed = JSON.parse(trimmed)
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          results.push(parsed as Record<string, unknown>)
        }
      } catch {
        // skip invalid lines
      }
    }
    return results
  }
}
