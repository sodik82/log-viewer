import type { ILogLoader, ParseResult } from '../types/log'

export class CsvLogLoader implements ILogLoader {
  readonly name = 'CSV'
  readonly extensions = ['.csv']

  parse(_content: string, _fileName: string): ParseResult {
    console.warn('CsvLogLoader is not yet implemented')
    return { entries: [], timestampField: null }
  }
}
