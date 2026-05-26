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

const KIBANA_EXPORT_HEADER = '"@timestamp","_source"'

const KIBANA_EXPORT_ROW_ERROR =
  '"Apr 14, 2026 @ 11:11:05.315",' +
  '"{""@timestamp"":""Apr 14, 2026 @ 11:11:05.315"",""level"":""ERROR"",' +
  '""message"":""Connection refused"",""service"":""auth-service"",' +
  '""kubernetes.pod_name"":""app-pod-abc"",""kubernetes.namespace_name"":""production""}"'

const KIBANA_EXPORT_ROW_INFO =
  '"Apr 14, 2026 @ 11:11:06.000",' +
  '"{""@timestamp"":""Apr 14, 2026 @ 11:11:06.000"",""level"":""INFO"",' +
  '""message"":""Request handled"",""service"":""auth-service"",' +
  '""kubernetes.pod_name"":""app-pod-abc"",""kubernetes.namespace_name"":""production""}"'

const KIBANA_EXPORT_CSV = [
  KIBANA_EXPORT_HEADER,
  KIBANA_EXPORT_ROW_ERROR,
  KIBANA_EXPORT_ROW_INFO,
].join('\n')

describe('CsvLogLoader — Kibana export (CSV with embedded JSON in _source)', () => {
  const result = loader.parse(KIBANA_EXPORT_CSV, 'kibana-export.csv')

  it('parses two entries', () => {
    expect(result.entries).toHaveLength(2)
  })

  it('detects @timestamp as timestamp field', () => {
    expect(result.timestampField).toBe('@timestamp')
  })

  it('parses timestamp from inner JSON as Date', () => {
    const e = result.entries[0]
    expect(e._timestamp).toBeInstanceOf(Date)
    expect((e._timestamp as Date).toISOString()).toBe('2026-04-14T11:11:05.315Z')
  })

  it('promotes inner JSON fields to top level', () => {
    const e = result.entries[0]
    expect(e.level).toBe('ERROR')
    expect(e.message).toBe('Connection refused')
    expect(e.service).toBe('auth-service')
    expect(e['kubernetes.pod_name']).toBe('app-pod-abc')
    expect(e['kubernetes.namespace_name']).toBe('production')
  })

  it('drops the _source wrapper key', () => {
    expect(result.entries[0]).not.toHaveProperty('_source')
  })

  it('parses second entry correctly', () => {
    const e = result.entries[1]
    expect(e.level).toBe('INFO')
    expect(e.message).toBe('Request handled')
    expect((e._timestamp as Date).toISOString()).toBe('2026-04-14T11:11:06.000Z')
  })
})

describe('CsvLogLoader — JSON field edge cases', () => {
  it('preserves string starting with { that is not valid JSON', () => {
    const csv = 'timestamp,payload\n2026-04-14T11:11:05.000Z,{not valid json'
    const result = loader.parse(csv, 'test.csv')
    expect(result.entries[0].payload).toBe('{not valid json')
  })

  it('preserves JSON array value without expansion', () => {
    const csv = 'timestamp,payload\n2026-04-14T11:11:05.000Z,"[1,2,3]"'
    const result = loader.parse(csv, 'test.csv')
    expect(result.entries[0].payload).toBe('[1,2,3]')
  })

  it('flattens nested objects inside JSON value to dot-notation', () => {
    const csv = 'timestamp,meta\n2026-04-14T11:11:05.000Z,"{""context"":{""user"":""alice""}}"'
    const result = loader.parse(csv, 'test.csv')
    expect(result.entries[0]['context.user']).toBe('alice')
    expect(result.entries[0]).not.toHaveProperty('meta')
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

// Kibana "discover" CSV export where every data column is prefixed with _source.
// All top-level keys start with _ so timestamp detection returns null — timestamps
// are nested inside the _source object and are not directly visible to the detector.
const KIBANA_FLAT_HEADER =
  '_index,_id,' +
  '_source.@timestamp,_source.timestamp,_source.level,_source.message,_source.loggerName,' +
  '_source.mdc.spanId,_source.mdc.traceId,' +
  '_source.kubernetes.pod_name,_source.kubernetes.namespace_name,' +
  '_source.kubernetes.labels.app_kubernetes_io/name'

const KIBANA_FLAT_ROW_INFO =
  'logs-example-2026.05.24,aAAAAAAAAAAAAAAAA111,' +
  '"May 24, 2026 @ 10:00:01.100",2026-05-24T08:00:01.100Z,INFO,' +
  'Generic item with ID [98765432109876543210] deleted.,com.example.app.service.ItemService,' +
  'aabbccdd11223344,aabbccddeeff00112233445566778899,' +
  'myservice-1a2b3c4d5e-fghij,example-ns,myservice'

const KIBANA_FLAT_ROW_ACCESS =
  'logs-example-2026.05.24,bBBBBBBBBBBBBBBBB222,' +
  '"May 24, 2026 @ 10:00:01.200",2026-05-24T08:00:01.200Z,INFO,' +
  '"10.0.1.100 - CN=appclient [24/May/2026:08:00:01 +0000] 29 ms ""DELETE /myservice/v2/DEMO/items HTTP/1.1"" 204",io.example.http.access-log,' +
  'aabbccdd11223344,aabbccddeeff00112233445566778899,' +
  'myservice-1a2b3c4d5e-fghij,example-ns,myservice'

const KIBANA_FLAT_CSV = [KIBANA_FLAT_HEADER, KIBANA_FLAT_ROW_INFO, KIBANA_FLAT_ROW_ACCESS].join(
  '\n'
)

describe('CsvLogLoader — Kibana flat-columns format (all headers _source. prefixed)', () => {
  const result = loader.parse(KIBANA_FLAT_CSV, 'kibana-flat.csv')

  it('parses two entries', () => {
    expect(result.entries).toHaveLength(2)
  })

  it('returns null timestampField — timestamps are nested inside _source, not at top level', () => {
    expect(result.timestampField).toBeNull()
  })

  it('sets _timestamp to null when no timestamp field detected', () => {
    expect(result.entries[0]._timestamp).toBeNull()
  })

  it('enriches entries with internal fields', () => {
    const e = result.entries[0]
    expect(e._sourceFile).toBe('kibana-flat.csv')
    expect(e._rawIndex).toBe(0)
    expect(result.entries[1]._rawIndex).toBe(1)
  })

  it('builds _source as a nested object with level and message', () => {
    const src = result.entries[0]._source as Record<string, unknown>
    expect(src.level).toBe('INFO')
    expect(src.message).toBe('Generic item with ID [98765432109876543210] deleted.')
    expect(src.loggerName).toBe('com.example.app.service.ItemService')
  })

  it('preserves @timestamp string inside _source', () => {
    const src = result.entries[0]._source as Record<string, unknown>
    expect(src['@timestamp']).toBe('May 24, 2026 @ 10:00:01.100')
  })

  it('builds _source.mdc as a nested object', () => {
    const src = result.entries[0]._source as Record<string, unknown>
    expect(src.mdc).toMatchObject({
      spanId: 'aabbccdd11223344',
      traceId: 'aabbccddeeff00112233445566778899',
    })
  })

  it('builds _source.kubernetes as a nested object', () => {
    const src = result.entries[0]._source as Record<string, unknown>
    expect(src.kubernetes).toMatchObject({
      pod_name: 'myservice-1a2b3c4d5e-fghij',
      namespace_name: 'example-ns',
    })
  })

  it('handles slash in kubernetes label key', () => {
    const src = result.entries[0]._source as Record<string, unknown>
    const labels = (src.kubernetes as Record<string, unknown>).labels as Record<string, unknown>
    expect(labels['app_kubernetes_io/name']).toBe('myservice')
  })

  it('parses access-log message with embedded quotes in second entry', () => {
    const src = result.entries[1]._source as Record<string, unknown>
    expect(src.level).toBe('INFO')
    expect(src.loggerName).toBe('io.example.http.access-log')
    expect(src.message as string).toContain('DELETE /myservice/v2/DEMO/items')
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
