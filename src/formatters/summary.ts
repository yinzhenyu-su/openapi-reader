import type { ApiSummary } from '../types.js'
import { fmtSeparator } from './shared.js'

export function formatSummaryHuman(summary: ApiSummary): string {
  const lines: string[] = []

  const titleLine = summary.title ? `${summary.title} v${summary.version}` : `API v${summary.version}`
  lines.push(titleLine)
  lines.push(fmtSeparator())
  lines.push(`Endpoints:  ${summary.endpoints}`)

  if (summary.tags.length > 0) {
    const tagsStr = summary.tags
      .map(t => `${t.name} (${t.count})`)
      .join(', ')
    lines.push(`Tags:       ${tagsStr}`)
  }

  lines.push(`Auth:       ${summary.auth}`)

  if (summary.servers.length > 0) {
    lines.push(`Servers:    ${summary.servers.join(', ')}`)
  }

  lines.push(`Models:     ${summary.models}`)

  return lines.join('\n')
}
