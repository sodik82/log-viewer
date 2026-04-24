import { describe, it, expect } from 'vitest'
import { getLoaderForFile } from '../index'

// Minimal fixture for each format — just enough to confirm the loader dispatches and parses correctly

const JSON_ARRAY = JSON.stringify([
  {
    timestamp: '2026-03-10T08:00:00.000Z',
    level: 'INFO',
    message: 'json array entry',
    service: 'auth',
  },
])

const NDJSON =
  '{"timestamp":"2026-03-10T08:00:00.000Z","level":"INFO","message":"ndjson entry","service":"auth"}'

const CSV = [
  'timestamp,level,message,service',
  '2026-03-10T08:00:00.000Z,INFO,csv entry,auth',
].join('\n')

const JAVA_LOG =
  '2026-03-10 08:00:00.000 [main-thread] [] INFO  com.example.app.Service - freetext entry'

describe('Loader dispatch — format × extension', () => {
  describe('JSON array (.json)', () => {
    const result = getLoaderForFile('app.json').parse(JSON_ARRAY, 'app.json')
    it('parses entries', () => expect(result.entries).toHaveLength(1))
    it('detects timestamp field', () => expect(result.timestampField).toBe('timestamp'))
    it('sets _timestamp as Date', () => expect(result.entries[0]._timestamp).toBeInstanceOf(Date))
  })

  describe('NDJSON (.ndjson)', () => {
    const result = getLoaderForFile('app.ndjson').parse(NDJSON, 'app.ndjson')
    it('parses entries', () => expect(result.entries).toHaveLength(1))
    it('detects timestamp field', () => expect(result.timestampField).toBe('timestamp'))
    it('sets _timestamp as Date', () => expect(result.entries[0]._timestamp).toBeInstanceOf(Date))
  })

  describe('JSON array in .log (content sniffing)', () => {
    const result = getLoaderForFile('app.log', JSON_ARRAY).parse(JSON_ARRAY, 'app.log')
    it('parses entries', () => expect(result.entries).toHaveLength(1))
    it('detects timestamp field', () => expect(result.timestampField).toBe('timestamp'))
    it('sets _timestamp as Date', () => expect(result.entries[0]._timestamp).toBeInstanceOf(Date))
    it('reads message field', () => expect(result.entries[0].message).toBe('json array entry'))
  })

  describe('NDJSON in .log (content sniffing)', () => {
    const result = getLoaderForFile('app.log', NDJSON).parse(NDJSON, 'app.log')
    it('parses entries', () => expect(result.entries).toHaveLength(1))
    it('detects timestamp field', () => expect(result.timestampField).toBe('timestamp'))
    it('sets _timestamp as Date', () => expect(result.entries[0]._timestamp).toBeInstanceOf(Date))
    it('reads message field', () => expect(result.entries[0].message).toBe('ndjson entry'))
  })

  describe('Java freetext (.log)', () => {
    const result = getLoaderForFile('app.log', JAVA_LOG).parse(JAVA_LOG, 'app.log')
    it('parses entries', () => expect(result.entries).toHaveLength(1))
    it('detects timestamp field', () => expect(result.timestampField).toBe('timestamp'))
    it('sets _timestamp as Date', () => expect(result.entries[0]._timestamp).toBeInstanceOf(Date))
    it('extracts level field', () => expect(result.entries[0].level).toBe('INFO'))
    it('extracts logger field', () =>
      expect(result.entries[0].logger).toBe('com.example.app.Service'))
  })

  describe('CSV (.csv)', () => {
    const result = getLoaderForFile('app.csv').parse(CSV, 'app.csv')
    it('parses entries', () => expect(result.entries).toHaveLength(1))
    it('detects timestamp field', () => expect(result.timestampField).toBe('timestamp'))
    it('sets _timestamp as Date', () => expect(result.entries[0]._timestamp).toBeInstanceOf(Date))
    it('reads message field', () => expect(result.entries[0].message).toBe('csv entry'))
  })
})
