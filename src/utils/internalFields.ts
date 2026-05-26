export const TIMESTAMP_FIELD = '_timestamp'
export const SOURCE_FILE_FIELD = '_sourceFile'
export const RAW_INDEX_FIELD = '_rawIndex'

const INTERNAL_FIELDS = new Set([TIMESTAMP_FIELD, SOURCE_FILE_FIELD, RAW_INDEX_FIELD])

export function isInternalField(key: string): boolean {
  return INTERNAL_FIELDS.has(key)
}
