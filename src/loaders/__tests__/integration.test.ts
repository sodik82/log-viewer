import { describe, it, expect } from 'vitest'
import { getLoaderForFile, guessVirtualName } from '../index'

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

describe('guessVirtualName — format detection for pasted content', () => {
  // JSON array — app-logs.json starts with [
  it('returns .json for JSON array (like app-logs.json)', () => {
    const content = '[{"timestamp":"2026-04-16T14:05:13.001Z","level":"INFO","service":"app"}]'
    expect(guessVirtualName(content, 1)).toBe('paste-1.json')
  })

  // NDJSON — app-logs.ndjson starts with {
  it('returns .json for NDJSON (like app-logs.ndjson)', () => {
    const content =
      '{"timestamp":"2026-04-16T14:05:13.001Z","level":"INFO","service":"app","message":"Starting"}'
    expect(guessVirtualName(content, 2)).toBe('paste-2.json')
  })

  // Java freetext — app.log starts with a dated log line, no quotes or JSON
  it('returns .log for Java freetext (like app.log)', () => {
    const content =
      '2026-04-16 14:05:13.001 [main] INFO  com.example.app.Application - Starting version 2.4.1'
    expect(guessVirtualName(content, 3)).toBe('paste-3.log')
  })

  // Kibana CSV export — kibana-export.csv has quoted headers
  it('returns .csv for Kibana CSV export with quoted headers (like kibana-export.csv)', () => {
    const content = '"@timestamp","_source"\n"Apr 16, 2026 @ 14:05:13.001","{""level"":""INFO""}"'
    expect(guessVirtualName(content, 4)).toBe('paste-4.csv')
  })

  // Kibana txt export — kibana-export.txt also has quoted headers
  it('returns .csv for Kibana txt export with quoted headers (like kibana-export.txt)', () => {
    const content =
      '"@timestamp","kubernetes.labels.app_kubernetes_io/name","log"\n"Jun 1, 2026 @ 10:00:00.001","auth-service","entry"'
    expect(guessVirtualName(content, 5)).toBe('paste-5.csv')
  })

  // standard.csv has plain unquoted headers — all tokens are space-free field names
  it('returns .csv for standard CSV with unquoted headers (like standard.csv)', () => {
    const content =
      'timestamp,level,service,thread,logger,message,exception,mdc.traceId,mdc.spanId\n2026-04-16T14:05:13.001Z,INFO,app,main,com.example.app.Application,Starting,,,\n'
    expect(guessVirtualName(content, 6)).toBe('paste-6.csv')
  })

  // kibana-flat-columns.csv also has unquoted headers
  it('returns .csv for flat-column CSV with unquoted headers (like kibana-flat-columns.csv)', () => {
    const content =
      '_index,_id,_source.@timestamp,_source.level,_source.service\nlogs-example,id001,"Apr 16, 2026 @ 14:05:13.001",INFO,app'
    expect(guessVirtualName(content, 7)).toBe('paste-7.csv')
  })

  // kibana-discover.csv uses backslash-escaped dots in column names, unquoted headers
  it('returns .csv for CSV with backslash-escaped dot column names (like kibana-discover.csv)', () => {
    const content =
      'message,logger,level,kubernetes\\.pod_name,kubernetes\\.container_name\n"App started",com.example.Service,INFO,pod-abc,container-xyz'
    expect(guessVirtualName(content, 8)).toBe('paste-8.csv')
  })

  // freetext prose with commas should NOT be detected as CSV (tokens contain spaces)
  it('returns .log when a comma-containing line has spaces in its tokens', () => {
    const content = 'Starting application, loading config, connecting to database'
    expect(guessVirtualName(content, 9)).toBe('paste-9.log')
  })

  it('embeds the paste index in the filename', () => {
    expect(guessVirtualName('[{}]', 42)).toBe('paste-42.json')
  })

  it('handles leading whitespace before JSON', () => {
    expect(guessVirtualName('  \n[{"level":"INFO"}]', 1)).toBe('paste-1.json')
  })
})

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
