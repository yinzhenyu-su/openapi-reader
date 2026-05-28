import type { EndpointDetail, FieldInfo } from '../types.js'
import { fmtFields, fmtSeparator } from './shared.js'

export function formatDetail(detail: EndpointDetail): string {
  const lines: string[] = []

  lines.push(`${detail.method} ${detail.path}`)
  if (detail.deprecated) {
    const msg = detail.deprecationMessage ? `  ${detail.deprecationMessage}` : ''
    lines.push(`⚠ DEPRECATED${msg}`)
  }
  if (detail.summary) lines.push(detail.summary)
  lines.push(fmtSeparator())

  if (detail.auth) {
    lines.push(`Auth:  ${detail.auth}`)
    lines.push('')
  }

  if (detail.params.pathParams.length > 0) {
    lines.push('Path Parameters:')
    lines.push(fmtFields(detail.params.pathParams))
    lines.push('')
  }

  if (detail.params.queryParams.length > 0) {
    lines.push('Query Parameters:')
    lines.push(fmtFields(detail.params.queryParams))
    lines.push('')
  }

  if (detail.params.headerParams.length > 0) {
    lines.push('Header Parameters:')
    lines.push(fmtFields(detail.params.headerParams))
    lines.push('')
  }

  if (detail.params.body) {
    const body = detail.params.body
    lines.push(`Request Body (${body.contentType})${body.required ? ' ✱' : ''}:`)
    lines.push(fmtFields(body.fields))
    lines.push('')
  }

  if (detail.responses.length > 0) {
    lines.push('Responses:')
    for (const resp of detail.responses) {
      const desc = resp.description ? `  ${resp.description}` : ''
      lines.push(`  ${resp.code}${desc}`)
      if (resp.fields.length > 0) {
        lines.push(fmtFields(resp.fields, 4))
      }
    }
    lines.push('')
  }

  const errorCodes = detail.codes.filter(c => c.code.startsWith('4') || c.code.startsWith('5'))
  if (errorCodes.length > 0) {
    lines.push('Errors:')
    for (const code of errorCodes) {
      const desc = code.description ? `  ${code.description}` : ''
      lines.push(`  ${code.code}${desc}`)
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

export function formatParamsOnly(detail: EndpointDetail): string {
  const lines: string[] = []

  lines.push(`${detail.method} ${detail.path}`)
  if (detail.deprecated) lines.push('⚠ DEPRECATED')
  if (detail.summary) lines.push(detail.summary)
  lines.push(fmtSeparator())

  if (detail.auth) {
    lines.push(`Auth:  ${detail.auth}`)
    lines.push('')
  }

  if (detail.params.pathParams.length > 0) {
    lines.push('Path Parameters:')
    lines.push(fmtFields(detail.params.pathParams))
    lines.push('')
  }

  if (detail.params.queryParams.length > 0) {
    lines.push('Query Parameters:')
    lines.push(fmtFields(detail.params.queryParams))
    lines.push('')
  }

  if (detail.params.headerParams.length > 0) {
    lines.push('Header Parameters:')
    lines.push(fmtFields(detail.params.headerParams))
    lines.push('')
  }

  if (detail.params.body) {
    const body = detail.params.body
    lines.push(`Request Body (${body.contentType})${body.required ? ' ✱' : ''}:`)
    lines.push(fmtFields(body.fields))
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

export function formatResponseOnly(
  method: string,
  path: string,
  responses: { code: string; description: string; fields: FieldInfo[] }[]
): string {
  const lines: string[] = []

  lines.push(`${method} ${path}`)
  lines.push(fmtSeparator())

  for (const resp of responses) {
    const desc = resp.description ? `  ${resp.description}` : ''
    lines.push(`${resp.code}${desc}:`)
    if (resp.fields.length > 0) {
      lines.push(fmtFields(resp.fields, 2))
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

export function formatCodesOnly(
  method: string,
  path: string,
  codes: { code: string; description: string }[]
): string {
  const lines: string[] = []

  lines.push(`${method} ${path} → Possible codes:`)
  for (const { code, description } of codes) {
    const desc = description ? `    ${description}` : ''
    lines.push(`  ${code}${desc}`)
  }

  return lines.join('\n')
}
