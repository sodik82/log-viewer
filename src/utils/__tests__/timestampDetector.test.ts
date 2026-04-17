import { describe, it, expect } from 'vitest'
import { detectTimestampField, parseTimestampValue } from '../timestampDetector'

describe('detectTimestampField', () => {
  it('detects ISO string in timestamp field', () => {
    const entries = [{ timestamp: '2026-04-16T14:05:13.224Z', level: 'ERROR' }]
    expect(detectTimestampField(entries)).toBe('timestamp')
  })

  it('detects @timestamp field', () => {
    const entries = [{ '@timestamp': '2026-04-16T14:05:13.224Z', message: 'hello' }]
    expect(detectTimestampField(entries)).toBe('@timestamp')
  })

  it('prefers higher-priority name when multiple candidates exist', () => {
    const entries = [{ created_at: '2026-04-16T14:00:00.000Z', time: '2026-04-16T14:00:00.000Z' }]
    // 'time' has higher priority than 'created_at'
    expect(detectTimestampField(entries)).toBe('time')
  })

  it('returns null when no timestamp fields exist', () => {
    const entries = [{ level: 'INFO', message: 'hello' }]
    expect(detectTimestampField(entries)).toBeNull()
  })

  it('returns null when hit rate is below 80%', () => {
    const entries = [
      { ts: '2026-04-16T14:00:00.000Z' },
      { ts: 'not-a-date' },
      { ts: 'not-a-date' },
      { ts: 'not-a-date' },
      { ts: 'not-a-date' },
    ]
    expect(detectTimestampField(entries)).toBeNull()
  })

  it('detects millisecond epoch numbers as timestamps', () => {
    const entries = [{ ts: 1713276313224, level: 'INFO' }]
    expect(detectTimestampField(entries)).toBe('ts')
  })

  it('ignores fields starting with underscore', () => {
    const entries = [{ _timestamp: '2026-04-16T14:00:00.000Z', message: 'hi' }]
    expect(detectTimestampField(entries)).toBeNull()
  })

  it('returns null for empty entries array', () => {
    expect(detectTimestampField([])).toBeNull()
  })
})

describe('parseTimestampValue', () => {
  it('parses ISO string to Date', () => {
    const d = parseTimestampValue('2026-04-16T14:05:13.224Z')
    expect(d).toBeInstanceOf(Date)
    expect(d!.toISOString()).toBe('2026-04-16T14:05:13.224Z')
  })

  it('parses millisecond epoch number to Date', () => {
    const d = parseTimestampValue(1713276313224)
    expect(d).toBeInstanceOf(Date)
    expect(d!.getFullYear()).toBe(2024)
  })

  it('returns null for null input', () => {
    expect(parseTimestampValue(null)).toBeNull()
  })

  it('returns null for unparseable string', () => {
    expect(parseTimestampValue('not-a-date')).toBeNull()
  })
})
