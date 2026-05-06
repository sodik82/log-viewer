export function reorderColumns(order: string[], srcId: string, dstId: string): string[] {
  const next = [...order]
  const from = next.indexOf(srcId)
  const to = next.indexOf(dstId)
  if (from === -1 || to === -1) return order
  next.splice(from, 1)
  next.splice(to, 0, srcId)
  return next
}
