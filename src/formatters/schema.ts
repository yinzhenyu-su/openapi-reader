import type { SchemaInfo, BackRef } from '../types.js'
import { fmtFields, fmtSeparator } from './shared.js'

export function formatSchemaHuman(schema: SchemaInfo): string {
  const lines: string[] = []

  lines.push(`${schema.name}`)
  lines.push(fmtSeparator())

  if (schema.fields.length === 0) {
    lines.push('(no fields)')
  } else {
    lines.push(fmtFields(schema.fields))
  }

  return lines.join('\n')
}

export function formatSchemaWithBackRefsHuman(schema: SchemaInfo, backRefs: BackRef[]): string {
  const lines = [formatSchemaHuman(schema), '']

  if (backRefs.length === 0) {
    lines.push('Not used by any endpoint')
  } else {
    lines.push('Used by:')
    for (const ref of backRefs) {
      lines.push(`  ${ref.method.padEnd(7)} ${ref.path}  (${ref.location})`)
    }
  }

  return lines.join('\n')
}

export function formatSchemaNotFound(name: string): string {
  return `Schema "${name}" not found. Available schemas may need to be listed first.`
}
