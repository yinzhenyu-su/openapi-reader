import type { EndpointSummary, FieldInfo } from '../types.js'
import { truncateDesc, fmtType } from './shared.js'

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

export function formatSearchAllHuman(
  endpoints: EndpointSummary[],
  keyword: string,
  schemaFields: { schema: string; fields: FieldInfo[] }[],
  endpointFields: { method: string; path: string; fields: FieldInfo[] }[]
): string {
  const sections: string[] = []
  sections.push(`Search results for "${keyword}":`)

  if (endpoints.length > 0) {
    sections.push('')
    sections.push('Endpoints:')
    for (const ep of endpoints) {
      const summary = ep.summary ? `  ${ep.summary}` : ''
      sections.push(`  ${ep.method.padEnd(7)} ${ep.path}${summary}`)
    }
  }

  if (schemaFields.length > 0) {
    sections.push('')
    sections.push('Schema Fields:')
    for (const r of schemaFields) {
      sections.push(`  ${r.schema}`)
      for (const f of r.fields) {
        sections.push(`    ${f.name}: ${fmtType(f)}, ${f.required ? 'req' : 'opt'}${f.description ? `  ${truncateDesc(f.description)}` : ''}`)
      }
    }
  }

  if (endpointFields.length > 0) {
    sections.push('')
    sections.push('Endpoint Fields:')
    for (const r of endpointFields) {
      sections.push(`  ${r.method} ${r.path}`)
      for (const f of r.fields) {
        sections.push(`    ${f.name}: ${fmtType(f)}, ${f.required ? 'req' : 'opt'}${f.description ? `  ${truncateDesc(f.description)}` : ''}`)
      }
    }
  }

  if (endpoints.length === 0 && schemaFields.length === 0 && endpointFields.length === 0) {
    sections.push(`No results matching "${keyword}"`)
  }

  return sections.join('\n')
}
