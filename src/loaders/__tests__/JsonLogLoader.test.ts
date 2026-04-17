import { describe, it, expect } from 'vitest'
import { JsonLogLoader } from '../JsonLogLoader'

const loader = new JsonLogLoader()

const ENTRY_ERROR =
  '{"timestamp":"2026-04-16T14:05:13.224Z","level":"ERROR","thread":"HttpClient pool-1",' +
  '"logger":"com.example.http.Exporter","message":"Failed to export spans","context":"default",' +
  '"exception":"java.net.UnknownHostException: remote-host\\n\\tat com.example.Main.run(Main.java:42)"}'

const ENTRY_DEBUG =
  '{"timestamp":"2026-04-16T14:07:20.480Z","level":"DEBUG","thread":"http-exec-3",' +
  '"mdc":{"traceId":"0f17be2f532881a0","spanId":"89d9f72552b6e1"},' +
  '"logger":"com.example.cache.CacheLoader","message":"Loading 1 keys to the cache","context":"default"}'

describe('JsonLogLoader — NDJSON', () => {
  const result = loader.parse(`${ENTRY_ERROR}\n${ENTRY_DEBUG}`, 'test.log')

  it('detects timestamp field', () => {
    expect(result.timestampField).toBe('timestamp')
  })

  it('parses two entries', () => {
    expect(result.entries).toHaveLength(2)
  })

  it('enriches entry 0 with internal fields', () => {
    const e = result.entries[0]
    expect(e._sourceFile).toBe('test.log')
    expect(e._rawIndex).toBe(0)
    expect(e._timestamp).toBeInstanceOf(Date)
    expect((e._timestamp as Date).toISOString()).toBe('2026-04-16T14:05:13.224Z')
  })

  it('preserves ERROR entry fields', () => {
    const e = result.entries[0]
    expect(e.level).toBe('ERROR')
    expect(e.message).toBe('Failed to export spans')
    expect(e.exception as string).toContain('UnknownHostException')
  })

  it('enriches entry 1 with internal fields', () => {
    const e = result.entries[1]
    expect(e._rawIndex).toBe(1)
    expect((e._timestamp as Date).toISOString()).toBe('2026-04-16T14:07:20.480Z')
  })

  it('flattens DEBUG entry nested mdc into dot-notation fields', () => {
    const e = result.entries[1]
    expect(e.level).toBe('DEBUG')
    expect(e.message).toBe('Loading 1 keys to the cache')
    expect(e['mdc.traceId']).toBe('0f17be2f532881a0')
    expect(e['mdc.spanId']).toBe('89d9f72552b6e1')
  })
})

describe('JsonLogLoader — JSON array', () => {
  const content = `[${ENTRY_ERROR},${ENTRY_DEBUG}]`
  const result = loader.parse(content, 'test.json')

  it('detects timestamp field', () => {
    expect(result.timestampField).toBe('timestamp')
  })

  it('parses two entries', () => {
    expect(result.entries).toHaveLength(2)
  })

  it('attaches internal fields to all entries', () => {
    for (const e of result.entries) {
      expect(e._sourceFile).toBe('test.json')
      expect(e._timestamp).toBeInstanceOf(Date)
      expect(typeof e._rawIndex).toBe('number')
    }
  })
})

describe('JsonLogLoader — edge cases', () => {
  it('returns empty result for empty content', () => {
    const result = loader.parse('', 'empty.log')
    expect(result.entries).toHaveLength(0)
    expect(result.timestampField).toBeNull()
  })

  it('skips invalid NDJSON lines', () => {
    const content = `${ENTRY_ERROR}\nthis is not json`
    const result = loader.parse(content, 'mixed.log')
    expect(result.entries).toHaveLength(1)
  })

  it('handles a single NDJSON entry', () => {
    const result = loader.parse(ENTRY_ERROR, 'single.log')
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]._rawIndex).toBe(0)
  })
})
