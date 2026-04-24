import Papa from 'papaparse'
import type { ILogLoader, ParseResult } from '../types/log'
import { detectTimestampField, parseTimestampValue } from '../utils/timestampDetector'

export class CsvLogLoader implements ILogLoader {
  readonly name = 'CSV'

  isSupported(ext: string, _contentHint: string): boolean {
    return ext === '.csv'
  }

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
      return this.expandJsonFields(entry)
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

  private expandJsonFields(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'string' && val.startsWith('{')) {
        try {
          const parsed = JSON.parse(val)
          if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
            Object.assign(result, this.flattenJson(parsed as Record<string, unknown>))
            continue
          }
        } catch {
          // not valid JSON — keep original value
        }
      }
      result[key] = val
    }
    return result
  }

  private flattenJson(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        Object.assign(result, this.flattenJson(val as Record<string, unknown>, fullKey))
      } else {
        result[fullKey] = val
      }
    }
    return result
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
