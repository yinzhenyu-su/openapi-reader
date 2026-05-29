import type { EndpointSummary } from '../types.js'

export function formatListingBriefHuman(endpoints: EndpointSummary[]): string {
  const groups = new Map<string, EndpointSummary[]>()
  for (const ep of endpoints) {
    for (const tag of ep.tags) {
      if (!groups.has(tag)) groups.set(tag, [])
      groups.get(tag)!.push(ep)
    }
  }

  const sortedTags = [...groups.keys()].sort()
  const lines: string[] = []

  for (const tag of sortedTags) {
    const eps = groups.get(tag)!
    lines.push(`${tag}:`)
    for (const ep of eps) {
      lines.push(`  ${ep.method.padEnd(7)} ${ep.path}`)
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

export function formatListingHuman(endpoints: EndpointSummary[]): string {
  const groups = new Map<string, EndpointSummary[]>()
  for (const ep of endpoints) {
    for (const tag of ep.tags) {
      if (!groups.has(tag)) groups.set(tag, [])
      groups.get(tag)!.push(ep)
    }
  }

  const sortedTags = [...groups.keys()].sort()
  const lines: string[] = []

  for (const tag of sortedTags) {
    const eps = groups.get(tag)!
    lines.push(`${tag}:`)
    for (const ep of eps) {
      const summary = ep.summary ? `  ${ep.summary}` : ''
      const depMark = ep.deprecated ? '⚠ ' : '  '
      lines.push(`${depMark}${ep.method.padEnd(7)} ${ep.path}${summary}`)
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}
