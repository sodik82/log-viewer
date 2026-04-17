import type { ILogLoader } from '../types/log';
import { JsonLogLoader } from './JsonLogLoader';
import { CsvLogLoader } from './CsvLogLoader';

const LOADERS: ILogLoader[] = [new JsonLogLoader(), new CsvLogLoader()];

export function getLoaderForFile(fileName: string): ILogLoader {
  const ext = '.' + (fileName.split('.').pop() ?? '').toLowerCase();
  return LOADERS.find((l) => l.extensions.includes(ext)) ?? new JsonLogLoader();
}
