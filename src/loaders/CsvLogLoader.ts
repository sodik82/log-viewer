import Papa from 'papaparse'
import type { ILogLoader, ParseResult } from '../types/log'
import { detectTimestampField, parseTimestampValue } from '../utils/timestampDetector'

export class CsvLogLoader implements ILogLoader {
  readonly name = 'CSV'
  readonly extensions = ['.csv']

  parse(content: string, fileName: string): ParseResult {
    const { data, errors } = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h, // keep raw header; we handle escaping below
    })

    if (errors.length > 0 && data.length === 0) return { entries: [], timestampField: null }

    const rawObjects = data.map((row) => {
      const entry: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(row)) {
        if (val === '') continue
        this.setNested(entry, key, val)
      }
      return entry
    })

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

  private setNested(obj: Record<string, unknown>, key: string, value: string): void {
    // Split on unescaped dots only; \. is a literal dot in the field name
    const parts = key.split(/(?<!\\)\./).map((p) => p.replace(/\\\./g, '.'))
    if (parts.some((p) => p === '__proto__' || p === 'constructor' || p === 'prototype')) return
    let current = obj
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {}
      }
      current = current[part] as Record<string, unknown>
    }
    current[parts[parts.length - 1]] = value
  }
}
