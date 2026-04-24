import { describe, it, expect } from 'vitest'
import { FreeTextLogLoader } from '../FreeTextLogLoader'

const loader = new FreeTextLogLoader()

// Single-line INFO entry — no MDC context
const LINE_INFO =
  '2026-03-10 08:15:42.001 [main-thread-1] [] INFO  com.example.app.StartupService - Application started successfully'

// Single-line WARN entry — with MDC context
const LINE_WARN =
  '2026-03-10 08:15:43.200 [worker-thread-2] [req-abc123] WARN  com.example.app.RetryHandler - Retry attempt 1 of 3'

// ERROR entry with a 3-line stack trace
const LINE_ERROR =
  '2026-03-10 08:16:00.500 [processor-thread-1] [] ERROR com.example.app.DataProcessor - Failed to process record\n' +
  'java.lang.NullPointerException: Cannot read field "value" because object is null\n' +
  '\tat com.example.app.DataProcessor.process(DataProcessor.java:87)\n' +
  '\tat com.example.app.Worker.run(Worker.java:42)'

// INFO entry with a 4-line toString dump (non-stack-trace multiline)
const LINE_INFO_MULTILINE =
  '2026-03-10 08:16:01.000 [config-loader-1] [] INFO  com.example.app.ConfigService - Loaded rule: class RuleConfig {\n' +
  '    ruleId: sample-rule\n' +
  '    isActive: true\n' +
  '    threshold: 5\n' +
  '}'

describe('FreeTextLogLoader — basic parsing', () => {
  const result = loader.parse(`${LINE_INFO}\n${LINE_WARN}`, 'app.log')

  it('parses two entries', () => {
    expect(result.entries).toHaveLength(2)
  })

  it('detects timestamp field as "timestamp"', () => {
    expect(result.timestampField).toBe('timestamp')
  })

  it('sets _timestamp as Date on each entry', () => {
    for (const e of result.entries) {
      expect(e._timestamp).toBeInstanceOf(Date)
    }
  })

  it('sets _sourceFile on all entries', () => {
    for (const e of result.entries) {
      expect(e._sourceFile).toBe('app.log')
    }
  })

  it('sets _rawIndex on all entries', () => {
    expect(result.entries[0]._rawIndex).toBe(0)
    expect(result.entries[1]._rawIndex).toBe(1)
  })

  it('extracts level, logger, thread, timestamp, message fields', () => {
    const e = result.entries[0]
    expect(e.level).toBe('INFO')
    expect(e.logger).toBe('com.example.app.StartupService')
    expect(e.thread).toBe('main-thread-1')
    expect(e.timestamp).toBe('2026-03-10 08:15:42.001')
    expect(e.message).toBe('Application started successfully')
  })
})

describe('FreeTextLogLoader — MDC handling', () => {
  it('omits mdc field when MDC bracket is empty', () => {
    const result = loader.parse(LINE_INFO, 'app.log')
    expect('mdc' in result.entries[0]).toBe(false)
  })

  it('includes mdc field when MDC bracket is non-empty', () => {
    const result = loader.parse(LINE_WARN, 'app.log')
    expect(result.entries[0].mdc).toBe('req-abc123')
  })
})

describe('FreeTextLogLoader — multiline messages (stack trace)', () => {
  const result = loader.parse(LINE_ERROR, 'app.log')

  it('appends stack trace lines to message with newline separator', () => {
    const msg = result.entries[0].message as string
    expect(msg).toContain('\n')
    expect(msg.startsWith('Failed to process record')).toBe(true)
    expect(msg).toContain('NullPointerException')
    expect(msg).toContain('DataProcessor.java:87')
  })

  it('parses single entry from multiline ERROR', () => {
    expect(result.entries).toHaveLength(1)
  })

  it('trims trailing whitespace from final message', () => {
    const content = LINE_ERROR + '   \n   \n'
    const r = loader.parse(content, 'app.log')
    const msg = r.entries[0].message as string
    expect(msg).not.toMatch(/\s+$/)
  })
})

describe('FreeTextLogLoader — multiline messages (non-stack-trace body)', () => {
  const result = loader.parse(LINE_INFO_MULTILINE, 'app.log')

  it('accumulates all continuation lines into message', () => {
    const msg = result.entries[0].message as string
    expect(msg).toContain('ruleId: sample-rule')
    expect(msg).toContain('isActive: true')
    expect(msg).toContain('threshold: 5')
    expect(msg).toContain('}')
  })

  it('preserves line count in accumulated message', () => {
    const msg = result.entries[0].message as string
    const lines = msg.split('\n')
    expect(lines).toHaveLength(5)
  })
})

describe('FreeTextLogLoader — correct _rawIndex after multiline entry', () => {
  it('assigns sequential _rawIndex regardless of line count', () => {
    const content = `${LINE_ERROR}\n${LINE_INFO}`
    const result = loader.parse(content, 'app.log')
    expect(result.entries).toHaveLength(2)
    expect(result.entries[0]._rawIndex).toBe(0)
    expect(result.entries[1]._rawIndex).toBe(1)
  })
})

describe('FreeTextLogLoader — edge cases', () => {
  it('returns empty result for empty content', () => {
    const result = loader.parse('', 'app.log')
    expect(result.entries).toHaveLength(0)
    expect(result.timestampField).toBeNull()
  })

  it('returns empty result for blank content', () => {
    const result = loader.parse('   \n  \n  ', 'app.log')
    expect(result.entries).toHaveLength(0)
    expect(result.timestampField).toBeNull()
  })

  it('silently discards lines before the first header', () => {
    const content = 'this is a preamble line\nanother stray line\n' + LINE_INFO
    const result = loader.parse(content, 'app.log')
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].level).toBe('INFO')
  })

  it('handles a single entry', () => {
    const result = loader.parse(LINE_INFO, 'app.log')
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]._rawIndex).toBe(0)
  })

  it('flushes last entry when content has no trailing newline', () => {
    const content = LINE_INFO.trimEnd()
    const result = loader.parse(content, 'app.log')
    expect(result.entries).toHaveLength(1)
  })
})

describe('FreeTextLogLoader — timestamp parsing', () => {
  it('parses timestamp components correctly', () => {
    const result = loader.parse(LINE_INFO, 'app.log')
    const ts = result.entries[0]._timestamp as Date
    expect(ts.getFullYear()).toBe(2026)
    expect(ts.getMonth()).toBe(2) // March = 2 (0-indexed)
    expect(ts.getDate()).toBe(10)
    expect(ts.getHours()).toBe(8)
    expect(ts.getMinutes()).toBe(15)
    expect(ts.getSeconds()).toBe(42)
    expect(ts.getMilliseconds()).toBe(1)
  })

  it('sets _timestamp to null for a malformed timestamp', () => {
    const badLine = '9999-99-99 99:99:99.999 [t] [] INFO  com.example.Foo - msg'
    const result = loader.parse(badLine, 'app.log')
    // Entry is parsed (header regex matches) but timestamp is invalid
    if (result.entries.length > 0) {
      expect(result.entries[0]._timestamp).toBeNull()
    }
  })
})

describe('FreeTextLogLoader — all log levels', () => {
  const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'] as const

  for (const level of levels) {
    it(`parses ${level} level correctly`, () => {
      const line = `2026-03-10 09:00:00.000 [t] [] ${level} com.example.Foo - test message`
      const result = loader.parse(line, 'app.log')
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].level).toBe(level)
    })
  }
})
