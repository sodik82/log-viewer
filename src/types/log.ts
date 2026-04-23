export type LogEntry = Record<string, unknown> & {
  _timestamp: Date | null
  _sourceFile: string
  _rawIndex: number
}

export interface ParseResult {
  entries: LogEntry[]
  timestampField: string | null
}

export interface LoadedFile {
  id: string
  name: string
  entries: LogEntry[]
  timestampField: string | null
  error: string | null
}

export interface ColumnMeta {
  id: string
  width: number
}

export interface ILogLoader {
  readonly name: string
  readonly extensions: string[]
  parse(content: string, fileName: string): ParseResult
}
