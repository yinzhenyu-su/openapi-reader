import type { FieldInfo } from '../types.js'
import { truncateDesc, fmtType } from './shared.js'

function fmtField(field: FieldInfo): string {
  const type = fmtType(field)
  const req = field.required ? 'req' : 'opt'
  const desc = field.description ? `  ${truncateDesc(field.description)}` : ''
  const def = field.defaultValue ? `  =${field.defaultValue}` : ''
  const ex = field.example ? `  eg:${field.example}` : ''
  return `  - ${field.name}: ${type}, ${req}${desc}${def}${ex}`
}

export function formatSchemaFieldSearch(results: { schema: string; fields: FieldInfo[] }[], keyword: string): string {
  if (results.length === 0) {
    return `No schemas contain fields matching "${keyword}"`
  }

  const lines: string[] = [`## Schema field search: "${keyword}"`, '']
  for (const r of results) {
    lines.push(`**${r.schema}**`)
    for (const f of r.fields) {
      lines.push(fmtField(f))
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

export function formatEndpointFieldSearch(results: { method: string; path: string; fields: FieldInfo[] }[], keyword: string): string {
  if (results.length === 0) {
    return `No endpoints contain fields matching "${keyword}"`
  }

  const lines: string[] = [`## Endpoint field search: "${keyword}"`, '']
  for (const r of results) {
    lines.push(`**${r.method} ${r.path}**`)
    for (const f of r.fields) {
      lines.push(fmtField(f))
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}
