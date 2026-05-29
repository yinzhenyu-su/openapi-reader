import type { EndpointSummary } from '../types.js'

export function formatSearchHuman(results: EndpointSummary[], keyword: string): string {
  if (results.length === 0) {
    return `No endpoints matching "${keyword}"`
  }

  const lines: string[] = [`Search results for "${keyword}":`, '']
  for (const ep of results) {
    const summary = ep.summary ? `  ${ep.summary}` : ''
    lines.push(`  ${ep.method.padEnd(7)} ${ep.path}${summary}`)
  }

  return lines.join('\n')
}
