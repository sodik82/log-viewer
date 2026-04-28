import type { TextFilterValue } from '../components/LogTable/filters/filterFunctions'

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function highlightText(text: string, filter: TextFilterValue | undefined): React.ReactNode {
  if (!filter || filter.negate || !filter.value) return text

  const { operator, value, compiledRegex } = filter
  let regex: RegExp

  try {
    if (operator === 'contains') {
      regex = new RegExp(escapeRegex(value), 'gi')
    } else if (operator === 'equals') {
      regex = new RegExp('^(?:' + escapeRegex(value) + ')$', 'gi')
    } else {
      const src = compiledRegex?.source ?? value
      const flags = (compiledRegex?.flags ?? 'i').replace('g', '') + 'g'
      regex = new RegExp(src, flags)
    }
  } catch {
    return text
  }

  const matches = [...text.matchAll(regex)]
  if (matches.length === 0) return text

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  for (const match of matches) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    parts.push(<mark key={match.index}>{match[0]}</mark>)
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return <>{parts}</>
}
