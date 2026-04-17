const ISO_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
const MS_EPOCH_MIN = 1_000_000_000_000;
const MS_EPOCH_MAX = 9_999_999_999_999;

const PRIORITY_NAMES = [
  'timestamp', 'time', '@timestamp', 'ts', 'date', 'datetime', 'created_at', 'updated_at',
];

function isTimestampValue(val: unknown): boolean {
  if (typeof val === 'string') {
    if (!ISO_RE.test(val)) return false;
    const d = new Date(val);
    return !isNaN(d.getTime());
  }
  if (typeof val === 'number') {
    return val >= MS_EPOCH_MIN && val <= MS_EPOCH_MAX;
  }
  return false;
}

export function detectTimestampField(entries: Record<string, unknown>[]): string | null {
  if (entries.length === 0) return null;

  const sample = entries.slice(0, 20);

  const fieldHits = new Map<string, number>();
  const fieldTotal = new Map<string, number>();

  for (const entry of sample) {
    for (const [key, val] of Object.entries(entry)) {
      if (key.startsWith('_')) continue;
      if (val !== null && val !== undefined) {
        fieldTotal.set(key, (fieldTotal.get(key) ?? 0) + 1);
        if (isTimestampValue(val)) {
          fieldHits.set(key, (fieldHits.get(key) ?? 0) + 1);
        }
      }
    }
  }

  const candidates: string[] = [];
  for (const [field, hits] of fieldHits) {
    const total = fieldTotal.get(field) ?? 1;
    if (hits / total >= 0.8) {
      candidates.push(field);
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const ai = PRIORITY_NAMES.indexOf(a.toLowerCase());
    const bi = PRIORITY_NAMES.indexOf(b.toLowerCase());
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    const aHits = fieldHits.get(a) ?? 0;
    const bHits = fieldHits.get(b) ?? 0;
    if (bHits !== aHits) return bHits - aHits;
    return a.localeCompare(b);
  });

  return candidates[0] ?? null;
}

export function parseTimestampValue(val: unknown): Date | null {
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val as string | number);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
