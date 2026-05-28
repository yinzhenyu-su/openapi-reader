import type { FieldInfo } from '../types.js'

function truncateDesc(desc: string): string {
  if (!desc || desc.length <= 80) return desc
  const sentenceEnd = desc.indexOf('. ')
  if (sentenceEnd > 0 && sentenceEnd < 80) {
    return desc.slice(0, sentenceEnd + 1)
  }
  return desc.slice(0, 77) + '...'
}

function fmtType(field: FieldInfo): string {
  if (field.enumValues && field.enumValues.length > 0) {
    return field.enumValues.length <= 5
      ? field.enumValues.join(' | ')
      : `${field.enumValues[0]} | ...`
  }
  return field.type
}

function fmtRequired(field: FieldInfo): string {
  return field.required ? ' ✱' : '  '
}

function fmtField(field: FieldInfo, indent = 2): string {
  const pad = ' '.repeat(indent)
  const type = fmtType(field)
  const req = fmtRequired(field)
  const desc = field.description ? `  ${truncateDesc(field.description)}` : ''
  return `${pad}${field.name.padEnd(18)} ${type.padEnd(12)}${req}${desc}`
}

export function fmtFields(fields: FieldInfo[], indent = 2): string {
  const lines: string[] = []

  for (const field of fields) {
    if (field.oneOf) {
      lines.push(`${' '.repeat(indent)}${field.name}  ${field.type} (choose one):`)
      let idx = 1
      for (const vars of field.oneOf) {
        const typeName = vars.find(v => v.name === 'type' && v.enumValues)?.enumValues?.[0]
        const label = typeName ?? `Option ${idx}`
        lines.push(`${' '.repeat(indent + 2)}${label}:`)
        for (const v of vars) {
          if (v.name === 'type') continue
          lines.push(`${' '.repeat(indent + 4)}${v.name.padEnd(18)} ${fmtType(v).padEnd(12)}${fmtRequired(v)}${v.description ? `  ${truncateDesc(v.description)}` : ''}`)
        }
        idx++
      }
    } else if (field.children && field.children.length > 0) {
      lines.push(fmtField(field, indent))
      for (const child of field.children) {
        lines.push(fmtField(child, indent + 2))
      }
    } else {
      lines.push(fmtField(field, indent))
    }
  }

  return lines.join('\n')
}

export function fmtRequiredMark(required: boolean): string {
  return required ? '✱' : ' '
}

export function fmtSectionHeader(title: string, required?: boolean): string {
  const req = required ? ' ✱' : ''
  return `${title}${req}:`
}

export function fmtSeparator(length = 48): string {
  return '─'.repeat(length)
}

export { truncateDesc, fmtType, fmtRequired }
