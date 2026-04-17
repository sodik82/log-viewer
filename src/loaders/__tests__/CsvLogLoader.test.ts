import { describe, it, expect } from 'vitest'
import { CsvLogLoader } from '../CsvLogLoader'

const loader = new CsvLogLoader()

const HEADER = 'timestamp,level,thread,logger,message,context,exception,mdc.traceId,mdc.spanId'

const ROW_ERROR =
  '2026-04-16T14:05:13.224Z,ERROR,HttpClient pool-1,com.example.http.Exporter,' +
  'Failed to export spans,default,' +
  '"java.net.UnknownHostException: remote-host\\n\\tat com.example.Main.run(Main.java:42)"' +
  ',,'

const ROW_DEBUG =
  '2026-04-16T14:07:20.480Z,DEBUG,http-exec-3,com.example.cache.CacheLoader,' +
  'Loading 1 keys to the cache,default,,0f17be2f532881a0,89d9f72552b6e1'

const TWO_ROWS = [HEADER, ROW_ERROR, ROW_DEBUG].join('\n')

describe('CsvLogLoader — standard CSV', () => {
  const result = loader.parse(TWO_ROWS, 'test.csv')

  it('detects timestamp field', () => {
    expect(result.timestampField).toBe('timestamp')
  })

  it('parses two entries', () => {
    expect(result.entries).toHaveLength(2)
  })

  it('enriches entry 0 with internal fields', () => {
    const e = result.entries[0]
    expect(e._sourceFile).toBe('test.csv')
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

  it('preserves DEBUG entry fields including nested mdc', () => {
    const e = result.entries[1]
    expect(e.level).toBe('DEBUG')
    expect(e.message).toBe('Loading 1 keys to the cache')
    expect(e.mdc).toMatchObject({ traceId: '0f17be2f532881a0', spanId: '89d9f72552b6e1' })
  })
})

const KIBANA_HEADER = 'timestamp,message,kubernetes\\.pod_name,level'

const KIBANA_ROW_ERROR =
  '"Mar 27, 2026 @ 12:32:30.038",' +
  'Delta with sequence number 9999 for listId 3 and security key version 0 has been already applied to a full list,' +
  'list-management-0,ERROR'

const KIBANA_ROW_WARN =
  '"Mar 27, 2026 @ 12:32:30.038",' +
  'PublicException thrown. Translating the exception to error response.,' +
  'list-management-0,WARN'

const KIBANA_ROW_INFO =
  '"Mar 27, 2026 @ 12:32:30.039",' +
  '"Processing of event: HashedDeltaCreatedEvent(listId=3, deltaSeqNum=9999, securityKeyVersion=0)  ' +
  'produced response: {""status"":""ERROR"",""errorCode"":""SC_BAD_REQUEST"",' +
  '""timestamp"":""2026-03-27T11:32:30.038560508Z"",""traceId"":""a8a271652cde309410cbe0e0858c8fd6"",' +
  '""messages"":[{""code"":""requested_delta_outdated"",""params"":null}]}",' +
  'delta-listdistributor-859dd54b9d-mmts9,INFO'

const KIBANA_CSV = [KIBANA_HEADER, KIBANA_ROW_ERROR, KIBANA_ROW_WARN, KIBANA_ROW_INFO].join('\n')

describe('CsvLogLoader — Kibana format (escaped dot header, human-readable timestamp)', () => {
  const result = loader.parse(KIBANA_CSV, 'kibana.csv')

  it('detects timestamp field', () => {
    expect(result.timestampField).toBe('timestamp')
  })

  it('parses three entries', () => {
    expect(result.entries).toHaveLength(3)
  })

  it('parses Kibana timestamp as Date', () => {
    const e = result.entries[0]
    expect(e._timestamp).toBeInstanceOf(Date)
    expect((e._timestamp as Date).toISOString()).toBe('2026-03-27T12:32:30.038Z')
  })

  it('preserves ERROR entry fields', () => {
    const e = result.entries[0]
    expect(e.level).toBe('ERROR')
    expect(e.message as string).toContain('sequence number 9999')
    expect(e['kubernetes.pod_name']).toBe('list-management-0')
  })

  it('preserves WARN entry fields', () => {
    const e = result.entries[1]
    expect(e.level).toBe('WARN')
    expect(e.message).toBe('PublicException thrown. Translating the exception to error response.')
    expect(e['kubernetes.pod_name']).toBe('list-management-0')
  })

  it('parses INFO entry with quoted commas and escaped quotes in message', () => {
    const e = result.entries[2]
    expect(e.level).toBe('INFO')
    expect(e['kubernetes.pod_name']).toBe('delta-listdistributor-859dd54b9d-mmts9')
    expect(e.message as string).toContain('HashedDeltaCreatedEvent')
    expect(e.message as string).toContain('"status":"ERROR"')
  })
})

describe('CsvLogLoader — security', () => {
  it('ignores __proto__ pollution attempt via header', () => {
    const csv = '__proto__.polluted,level\ntrue,ERROR'
    loader.parse(csv, 'evil.csv')
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined()
  })

  it('ignores constructor.prototype pollution attempt via header', () => {
    const csv = 'constructor.prototype.polluted,level\ntrue,ERROR'
    loader.parse(csv, 'evil.csv')
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined()
  })
})

describe('CsvLogLoader — edge cases', () => {
  it('returns empty result for empty content', () => {
    const result = loader.parse('', 'empty.csv')
    expect(result.entries).toHaveLength(0)
    expect(result.timestampField).toBeNull()
  })

  it('returns empty result for header-only CSV', () => {
    const result = loader.parse(HEADER, 'headers-only.csv')
    expect(result.entries).toHaveLength(0)
    expect(result.timestampField).toBeNull()
  })

  it('handles a single CSV entry', () => {
    const result = loader.parse([HEADER, ROW_DEBUG].join('\n'), 'single.csv')
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]._rawIndex).toBe(0)
  })
})
