import type { ILogLoader, LogEntry, ParseResult } from '../types/log'

const HEADER_RE =
  /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) \[([^\]]+)\] \[([^\]]*)\] (ERROR|WARN|INFO|DEBUG|TRACE|FATAL)\s+(\S+) - (.*)$/

interface Pending {
  timestamp: string
  thread: string
  mdc: string
  level: string
  logger: string
  messageLines: string[]
  rawIndex: number
}

export class FreeTextLogLoader implements ILogLoader {
  readonly name = 'Java Log (Logback / Log4j2)'

  isSupported(ext: string, contentHint: string): boolean {
    if (ext !== '.log') return false
    const first = contentHint.trimStart()[0]
    return first !== '[' && first !== '{'
  }

  parse(content: string, fileName: string): ParseResult {
    const trimmed = content.trim()
    if (!trimmed) return { entries: [], timestampField: null }

    const entries: LogEntry[] = []
    let pending: Pending | null = null
    let rawIndex = 0

    for (const line of trimmed.split('\n')) {
      const m = line.match(HEADER_RE)
      if (m) {
        if (pending) entries.push(this.flush(pending, fileName))
        pending = {
          timestamp: m[1],
          thread: m[2],
          mdc: m[3],
          level: m[4],
          logger: m[5],
          messageLines: [m[6]],
          rawIndex: rawIndex++,
        }
      } else if (pending) {
        pending.messageLines.push(line)
      }
    }

    if (pending) entries.push(this.flush(pending, fileName))

    return { entries, timestampField: entries.length > 0 ? 'timestamp' : null }
  }

  private flush(pending: Pending, fileName: string): LogEntry {
    const ts = this.parseTimestamp(pending.timestamp)
    const entry: LogEntry = {
      timestamp: pending.timestamp,
      level: pending.level,
      logger: pending.logger,
      thread: pending.thread,
      message: pending.messageLines.join('\n').trimEnd(),
      _timestamp: ts,
      _sourceFile: fileName,
      _rawIndex: pending.rawIndex,
    }
    if (pending.mdc) entry.mdc = pending.mdc
    return entry
  }

  private parseTimestamp(s: string): Date | null {
    const d = new Date(s.replace(' ', 'T'))
    return isNaN(d.getTime()) ? null : d
  }
}
