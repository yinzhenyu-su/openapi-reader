import type { EndpointSummary, EndpointDetail, FieldInfo, ApiSummary, SchemaInfo, BackRef } from '../types.js'
import { truncateDesc, fmtType } from './shared.js'

function fmtFieldLLM(field: FieldInfo, indent = 0): string {
  const pad = '  '.repeat(indent)
  const req = field.required ? 'req' : 'opt'
  const type = fmtType(field)
  const desc = field.description ? `  ${truncateDesc(field.description)}` : ''
  return `${pad}- ${field.name}: ${type}, ${req}${desc}`
}

function fmtFieldsLLM(fields: FieldInfo[], indent = 0): string {
  const lines: string[] = []

  for (const field of fields) {
    if (field.oneOf) {
      lines.push(`${'  '.repeat(indent)}- ${field.name}: ${field.type} (oneOf)`)
      for (const variants of field.oneOf) {
        const label = variants.find(v => v.name === 'type' && v.enumValues)?.enumValues?.[0]
        for (const v of variants) {
          if (v.name === 'type') continue
          lines.push(fmtFieldLLM(v, indent + 2))
        }
      }
    } else if (field.children && field.children.length > 0) {
      lines.push(fmtFieldLLM(field, indent))
      for (const child of field.children) {
        lines.push(fmtFieldLLM(child, indent + 1))
      }
    } else {
      lines.push(fmtFieldLLM(field, indent))
    }
  }

  return lines.join('\n')
}

export function formatListingLLM(endpoints: EndpointSummary[]): string {
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
    lines.push(`## ${tag}`)
    for (const ep of groups.get(tag)!) {
      const summary = ep.summary ? `  ${ep.summary}` : ''
      const depMark = ep.deprecated ? ' [DEPRECATED]' : ''
      lines.push(`${ep.method} ${ep.path}${depMark}${summary}`)
    }
  }

  return lines.join('\n')
}

export function formatDetailLLM(detail: EndpointDetail): string {
  const lines: string[] = []

  const depMark = detail.deprecated ? ' [DEPRECATED]' : ''
  lines.push(`## ${detail.method} ${detail.path}${depMark}`)
  if (detail.deprecated && detail.deprecationMessage) {
    lines.push(`> ${detail.deprecationMessage}`)
  }
  if (detail.summary) lines.push(detail.summary)

  if (detail.auth) {
    lines.push('')
    lines.push(`Auth: ${detail.auth}`)
  }

  if (detail.params.pathParams.length > 0) {
    lines.push('')
    lines.push('### Path Parameters')
    lines.push(fmtFieldsLLM(detail.params.pathParams))
  }

  if (detail.params.queryParams.length > 0) {
    lines.push('')
    lines.push('### Query Parameters')
    lines.push(fmtFieldsLLM(detail.params.queryParams))
  }

  if (detail.params.headerParams.length > 0) {
    lines.push('')
    lines.push('### Header Parameters')
    lines.push(fmtFieldsLLM(detail.params.headerParams))
  }

  if (detail.params.body) {
    lines.push('')
    const body = detail.params.body
    const req = body.required ? ', req' : ''
    lines.push(`### Request Body (${body.contentType}${req})`)
    lines.push(fmtFieldsLLM(body.fields))
  }

  if (detail.responses.length > 0) {
    lines.push('')
    for (const resp of detail.responses) {
      const desc = resp.description ? `  ${resp.description}` : ''
      lines.push(`### ${resp.code}${desc}`)
      if (resp.fields.length > 0) {
        lines.push(fmtFieldsLLM(resp.fields, 1))
      }
    }
  }

  const errorCodes = detail.codes.filter(c => c.code.startsWith('4') || c.code.startsWith('5'))
  if (errorCodes.length > 0) {
    lines.push('')
    lines.push('### Errors')
    for (const code of errorCodes) {
      const desc = code.description ? `  ${code.description}` : ''
      lines.push(`- ${code.code}${desc}`)
    }
  }

  return lines.join('\n')
}

export function formatParamsOnlyLLM(detail: EndpointDetail): string {
  const lines: string[] = []

  lines.push(`## ${detail.method} ${detail.path}`)
  if (detail.deprecated) lines.push('[DEPRECATED]')
  if (detail.summary) lines.push(detail.summary)

  if (detail.auth) {
    lines.push('')
    lines.push(`Auth: ${detail.auth}`)
  }

  if (detail.params.pathParams.length > 0) {
    lines.push('')
    lines.push('### Path Parameters')
    lines.push(fmtFieldsLLM(detail.params.pathParams))
  }

  if (detail.params.queryParams.length > 0) {
    lines.push('')
    lines.push('### Query Parameters')
    lines.push(fmtFieldsLLM(detail.params.queryParams))
  }

  if (detail.params.headerParams.length > 0) {
    lines.push('')
    lines.push('### Header Parameters')
    lines.push(fmtFieldsLLM(detail.params.headerParams))
  }

  if (detail.params.body) {
    lines.push('')
    const body = detail.params.body
    const req = body.required ? ', req' : ''
    lines.push(`### Request Body (${body.contentType}${req})`)
    lines.push(fmtFieldsLLM(body.fields))
  }

  return lines.join('\n')
}

export function formatResponseOnlyLLM(
  method: string,
  path: string,
  responses: { code: string; description: string; fields: FieldInfo[] }[]
): string {
  const lines: string[] = [`## ${method} ${path}`]

  for (const resp of responses) {
    const desc = resp.description ? `  ${resp.description}` : ''
    lines.push('')
    lines.push(`### ${resp.code}${desc}`)
    if (resp.fields.length > 0) {
      lines.push(fmtFieldsLLM(resp.fields, 1))
    }
  }

  return lines.join('\n')
}

export function formatCodesOnlyLLM(
  method: string,
  path: string,
  codes: { code: string; description: string }[]
): string {
  const lines: string[] = [`## ${method} ${path}`, '']

  for (const { code, description } of codes) {
    const desc = description ? `  ${description}` : ''
    lines.push(`- ${code}${desc}`)
  }

  return lines.join('\n')
}

export function formatSearchLLM(results: EndpointSummary[], keyword: string): string {
  if (results.length === 0) {
    return `No endpoints matching "${keyword}"`
  }

  const lines: string[] = [`## Search: "${keyword}"`]
  for (const ep of results) {
    const summary = ep.summary ? `  ${ep.summary}` : ''
    const depMark = ep.deprecated ? ' [DEPRECATED]' : ''
    lines.push(`${ep.method} ${ep.path}${depMark}${summary}`)
  }

  return lines.join('\n')
}

export function formatSchemaLLM(schema: SchemaInfo): string {
  const lines: string[] = [`## ${schema.name}`]

  if (schema.fields.length === 0) {
    lines.push('(no fields)')
  } else {
    lines.push(fmtFieldsLLM(schema.fields))
  }

  return lines.join('\n')
}

export function formatSchemaWithBackRefsLLM(schema: SchemaInfo, backRefs: BackRef[]): string {
  const lines = [formatSchemaLLM(schema), '']

  if (backRefs.length === 0) {
    lines.push('Not used by any endpoint')
  } else {
    lines.push('Used by:')
    for (const ref of backRefs) {
      lines.push(`  ${ref.method} ${ref.path}  (${ref.location})`)
    }
  }

  return lines.join('\n')
}

export function formatSummaryLLM(summary: ApiSummary): string {
  const lines: string[] = []

  const titleLine = summary.title ? `## ${summary.title} v${summary.version}` : `## API v${summary.version}`
  lines.push(titleLine)

  lines.push(`- Endpoints: ${summary.endpoints}`)

  if (summary.tags.length > 0) {
    const tagsStr = summary.tags
      .map(t => `${t.name} (${t.count})`)
      .join(', ')
    lines.push(`- Tags: ${tagsStr}`)
  }

  lines.push(`- Auth: ${summary.auth}`)

  if (summary.servers.length > 0) {
    lines.push(`- Servers: ${summary.servers.join(', ')}`)
  }

  lines.push(`- Models: ${summary.models}`)

  return lines.join('\n')
}
