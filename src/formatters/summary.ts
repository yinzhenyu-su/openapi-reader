import type { ApiSummary } from '../types.js'
import { fmtSeparator } from './shared.js'

export function formatSummaryHuman(summary: ApiSummary, schemaNames: string[]): string {
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

  if (summary.methods.length > 0) {
    const methodsStr = summary.methods
      .map(m => `${m.method} (${m.count})`)
      .join(', ')
    lines.push(`Methods:    ${methodsStr}`)
  }

  lines.push(`Auth:       ${summary.auth}`)

  if (summary.servers.length > 0) {
    lines.push(`Servers:    ${summary.servers.join(', ')}`)
  }

  lines.push(`Models:     ${summary.models}`)

  if (schemaNames.length > 0) {
    const SCHEMA_PREVIEW_LIMIT = 15
    if (schemaNames.length > SCHEMA_PREVIEW_LIMIT) {
      lines.push(`Schemas:    ${schemaNames.slice(0, SCHEMA_PREVIEW_LIMIT).join(', ')}, ... (${schemaNames.length - SCHEMA_PREVIEW_LIMIT} more)`)
    } else {
      lines.push(`Schemas:    ${schemaNames.join(', ')}`)
    }
  }

  lines.push('')
  lines.push('Commands: ls | get <method> <path> | search <keyword> | schema <name>')

  return lines.join('\n')
}
