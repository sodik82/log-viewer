import type { ILogLoader } from '../types/log'
import { JsonLogLoader } from './JsonLogLoader'
import { CsvLogLoader } from './CsvLogLoader'
import { FreeTextLogLoader } from './FreeTextLogLoader'

const jsonLoader = new JsonLogLoader()
const LOADERS: ILogLoader[] = [jsonLoader, new CsvLogLoader(), new FreeTextLogLoader()]

export function getLoaderForFile(fileName: string, contentHint = ''): ILogLoader {
  const ext = '.' + (fileName.split('.').pop() ?? '').toLowerCase()
  return LOADERS.find((l) => l.isSupported(ext, contentHint)) ?? jsonLoader
}
