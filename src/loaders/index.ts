import type { ILogLoader } from '../types/log'
import { JsonLogLoader } from './JsonLogLoader'
import { CsvLogLoader } from './CsvLogLoader'
import { FreeTextLogLoader } from './FreeTextLogLoader'

const jsonLoader = new JsonLogLoader()
const LOADERS: ILogLoader[] = [jsonLoader, new CsvLogLoader(), new FreeTextLogLoader()]

export function guessVirtualName(content: string, index: number): string {
  const trimmed = content.trimStart()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return `paste-${index}.json`
  const firstLine = trimmed.split('\n')[0] ?? ''
  if (firstLine.includes(',') && firstLine.includes('"')) return `paste-${index}.csv`
  return `paste-${index}.log`
}

export function getLoaderForFile(fileName: string, contentHint = ''): ILogLoader {
  const ext = '.' + (fileName.split('.').pop() ?? '').toLowerCase()
  const loader = LOADERS.find((l) => l.isSupported(ext, contentHint)) ?? jsonLoader
  console.debug(
    '[log-viewer] loader selected:',
    loader.name,
    '| ext:',
    ext,
    '| first 120 chars:',
    JSON.stringify(contentHint.slice(0, 120))
  )
  return loader
}
