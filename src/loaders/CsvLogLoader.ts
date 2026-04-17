import type { ILogLoader, ParseResult } from '../types/log'
import { detectTimestampField, parseTimestampValue } from '../utils/timestampDetector'

export class CsvLogLoader implements ILogLoader {
  readonly name = 'CSV'
  readonly extensions = ['.csv']

  parse(content: string, fileName: string): ParseResult {
    const trimmed = content.trim()
    if (!trimmed) return { entries: [], timestampField: null }

    const rawObjects = this.parseCsv(trimmed)
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

  private parseCsv(content: string): Record<string, unknown>[] {
    const lines = content.split('\n').map((l) => l.replace(/\r$/, ''))
    const nonBlank = lines.filter((l) => l.trim() !== '')
    if (nonBlank.length < 2) return []

    const headers = this.splitRow(nonBlank[0])
    const results: Record<string, unknown>[] = []

    for (let i = 1; i < nonBlank.length; i++) {
      const values = this.splitRow(nonBlank[i])
      const entry: Record<string, unknown> = {}
      for (let j = 0; j < headers.length; j++) {
        const val = values[j] ?? ''
        if (val === '') continue
        this.setNested(entry, headers[j], val)
      }
      results.push(entry)
    }

    return results
  }

  private splitRow(row: string): string[] {
    const fields: string[] = []
    let i = 0
    while (i <= row.length) {
      if (i === row.length) {
        fields.push('')
        break
      }
      if (row[i] === '"') {
        let field = ''
        i++ // skip opening quote
        while (i < row.length) {
          if (row[i] === '"' && row[i + 1] === '"') {
            field += '"'
            i += 2
          } else if (row[i] === '"') {
            i++ // skip closing quote
            break
          } else {
            field += row[i++]
          }
        }
        fields.push(field)
        if (row[i] === ',') i++
      } else {
        const end = row.indexOf(',', i)
        if (end === -1) {
          fields.push(row.slice(i))
          break
        }
        fields.push(row.slice(i, end))
        i = end + 1
      }
    }
    return fields
  }

  private setNested(obj: Record<string, unknown>, key: string, value: string): void {
    // Split on unescaped dots only; \. is a literal dot in the field name
    const parts = key.split(/(?<!\\)\./).map((p) => p.replace(/\\\./g, '.'))
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
