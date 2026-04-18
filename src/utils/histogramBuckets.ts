import type { LogEntry } from '../types/log'

export interface HistogramBucket {
  start: Date
  end: Date
  count: number
}

export interface BucketingResult {
  buckets: HistogramBucket[]
  bucketMs: number
  totalMin: Date
  totalMax: Date
}

const BUCKET_LADDER_MS = [
  1_000,
  5_000,
  15_000,
  30_000,
  60_000,
  5 * 60_000,
  15 * 60_000,
  30 * 60_000,
  3_600_000,
  3 * 3_600_000,
  6 * 3_600_000,
  12 * 3_600_000,
  86_400_000,
  7 * 86_400_000,
  30 * 86_400_000,
]

export function computeBuckets(
  entries: LogEntry[],
  targetBuckets = 50,
  range?: { from: Date; to: Date } | null
): BucketingResult | null {
  let timestamps = entries.map((e) => e._timestamp?.getTime()).filter((t): t is number => t != null)

  if (range) {
    const lo = range.from.getTime()
    const hi = range.to.getTime()
    timestamps = timestamps.filter((t) => t >= lo && t <= hi)
  }

  if (timestamps.length < 2) return null

  const minMs = range ? range.from.getTime() : Math.min(...timestamps)
  const maxMs = range ? range.to.getTime() : Math.max(...timestamps)
  const spanMs = Math.max(maxMs - minMs, 1)

  const maxBuckets = targetBuckets * 1.5
  let bucketMs = BUCKET_LADDER_MS[BUCKET_LADDER_MS.length - 1]
  for (const step of BUCKET_LADDER_MS) {
    if (Math.ceil(spanMs / step) <= maxBuckets) {
      bucketMs = step
      break
    }
  }

  const epochStart = Math.floor(minMs / bucketMs) * bucketMs
  const bucketCount = Math.ceil((maxMs - epochStart) / bucketMs) + 1
  const buckets: HistogramBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
    start: new Date(epochStart + i * bucketMs),
    end: new Date(epochStart + (i + 1) * bucketMs),
    count: 0,
  }))

  for (const ts of timestamps) {
    const idx = Math.floor((ts - epochStart) / bucketMs)
    if (idx >= 0 && idx < buckets.length) buckets[idx].count++
  }

  return {
    buckets,
    bucketMs,
    totalMin: new Date(minMs),
    totalMax: new Date(maxMs),
  }
}
