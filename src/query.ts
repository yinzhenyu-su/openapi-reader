import type { OpenAPIV3 } from 'openapi-types'
import { type OperationInfo, OpenApiParser } from './parser.js'
import type {
  EndpointSummary, EndpointDetail, FieldInfo,
  ParamSection, ResponseInfo, ApiSummary, SchemaInfo, BackRef
} from './types.js'

function getTypeString(schema: OpenAPIV3.SchemaObject): string {
  if (schema.oneOf && schema.oneOf.length > 0) return 'oneOf'
  if (schema.anyOf && schema.anyOf.length > 0) return 'anyOf'

  const type = schema.type
  if (type === 'array') {
    const items = schema.items as OpenAPIV3.SchemaObject | undefined
    if (items) return `${getBaseType(items)}[]`
    return 'array'
  }

  if (type === 'object') {
    const propCount = schema.properties ? Object.keys(schema.properties).length : 0
    if (propCount > 0) return schema.title ?? 'object'
    return 'object'
  }

  return getBaseType(schema)
}

function getBaseType(schema: OpenAPIV3.SchemaObject): string {
  if (schema.enum) return 'string'
  const type = schema.type
  if (type === 'integer' || type === 'number') return 'int'
  if (type === 'boolean') return 'bool'
  if (type === 'string') {
    if (schema.format === 'date-time' || schema.format === 'date') return 'datetime'
    if (schema.format === 'binary') return 'binary'
    return 'string'
  }
  return (type as string) ?? 'any'
}

function mergeAllOf(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
  if (!schema.allOf || schema.allOf.length === 0) return schema

  const merged: OpenAPIV3.SchemaObject = { ...schema }
  delete merged.allOf

  const allRequired = new Set<string>()
  const allProperties: Record<string, OpenAPIV3.SchemaObject> = {}
  const allEnums: string[] = []

  for (const entry of schema.allOf) {
    const sub = entry as OpenAPIV3.SchemaObject
    if (sub.properties) {
      Object.assign(allProperties, sub.properties)
    }
    if (sub.required) {
      for (const r of sub.required) allRequired.add(r)
    }
    if (sub.enum) {
      allEnums.push(...(sub.enum as string[]))
    }
  }

  if (schema.required) {
    for (const r of schema.required) allRequired.add(r)
  }

  if (Object.keys(allProperties).length > 0) {
    merged.properties = allProperties
    merged.required = [...allRequired]
  }
  if (allEnums.length > 0) merged.enum = allEnums

  return merged
}

function schemaToFields(
  schema: OpenAPIV3.SchemaObject,
  schemaRegistry: Record<string, OpenAPIV3.SchemaObject>,
  depth = -1,
  currentDepth = 0
): FieldInfo[] {
  const resolved = mergeAllOf(schema)
  if (!resolved.properties) return []
  const requiredSet = new Set(resolved.required ?? [])

  return Object.entries(resolved.properties).map(([name, prop]) => {
    const propSchema = prop as OpenAPIV3.SchemaObject
    const typeStr = getTypeString(propSchema)
    const field: FieldInfo = {
      name,
      type: typeStr,
      required: requiredSet.has(name),
      readOnly: propSchema.readOnly ?? false,
      description: propSchema.description ?? '',
      enumValues: propSchema.enum as string[] | undefined,
    }

    if (propSchema.oneOf && propSchema.oneOf.length > 0) {
      field.oneOf = propSchema.oneOf.map(variant => {
        const v = variant as OpenAPIV3.SchemaObject
        return schemaToFields(v, schemaRegistry, depth, currentDepth + 1)
      })
    }

    const canExpand = depth < 0 || currentDepth < depth
    if (canExpand && typeStr === 'object' && propSchema.properties) {
      field.children = schemaToFields(propSchema, schemaRegistry, depth, currentDepth + 1)
    }

    if (propSchema.type === 'array') {
      const items = propSchema.items as OpenAPIV3.SchemaObject | undefined
      if (items && items.type === 'object' && items.properties) {
        if (canExpand) {
          field.children = schemaToFields(items, schemaRegistry, depth, currentDepth + 1)
        } else {
          field.ref = items.title ?? undefined
        }
      }
    }

    if (propSchema.type === 'object' && !propSchema.properties) {
      field.ref = propSchema.title ?? undefined
    }

    return field
  })
}

function getMediaTypeFields(
  mediaType: OpenAPIV3.MediaTypeObject | undefined,
  schemaRegistry: Record<string, OpenAPIV3.SchemaObject>,
  depth = -1
): FieldInfo[] {
  if (!mediaType?.schema) return []
  const schema = mediaType.schema as OpenAPIV3.SchemaObject
  return schemaToFields(schema, schemaRegistry, depth)
}

function sortFields(fields: FieldInfo[]): FieldInfo[] {
  const priority = (f: FieldInfo): number => {
    if (f.required) return 0
    if (f.readOnly) return 2
    return 1
  }
  return [...fields].sort((a, b) => {
    const pa = priority(a)
    const pb = priority(b)
    if (pa !== pb) return pa - pb
    return a.name.localeCompare(b.name)
  })
}

export class QueryEngine {
  private parser: OpenApiParser

  constructor(parser: OpenApiParser) {
    this.parser = parser
  }

  getEndpointSummary(filters?: { tag?: string[]; method?: string; deprecated?: boolean }): EndpointSummary[] {
    let ops = this.parser.getAllOperations()

    if (filters?.tag && filters.tag.length > 0) {
      ops = ops.filter(op => op.tags.some(t => filters!.tag!.includes(t)))
    }
    if (filters?.method) {
      ops = ops.filter(op => op.method === filters.method!.toUpperCase())
    }
    if (filters?.deprecated !== undefined) {
      ops = ops.filter(op => (op as any).deprecated === filters.deprecated)
    }

    return ops.map(op => ({
      method: op.method,
      path: op.path,
      summary: op.summary,
      tags: op.tags.length > 0 ? op.tags : ['Other'],
      deprecated: (op as any).deprecated ?? false,
    }))
  }

  getEndpointDetail(method: string, path: string, depth = -1): EndpointDetail | undefined {
    const op = this.parser.getOperation(method, path)
    if (!op) return undefined

    const schemaRegistry = this.parser.getAllSchemas()
    const params = this.extractParams(op, schemaRegistry, depth)
    const responses = this.extractResponses(op, schemaRegistry, depth)
    const codes = this.extractCodes(op)

    const hasAuth = this.parser.requiresAuth(op.security)
    const schemes = this.parser.getAuthSchemes()
    const auth = hasAuth
      ? Object.values(schemes).join(', ') || 'Required'
      : 'None'

    return {
      method: op.method,
      path: op.path,
      summary: op.summary || op.description,
      auth,
      deprecated: (op as any).deprecated ?? false,
      deprecationMessage: (op as any).deprecationMessage ?? undefined,
      params,
      responses,
      codes,
    }
  }

  getEndpointParams(method: string, path: string, depth = -1): ParamSection | undefined {
    const op = this.parser.getOperation(method, path)
    if (!op) return undefined
    return this.extractParams(op, this.parser.getAllSchemas(), depth)
  }

  getEndpointResponses(method: string, path: string, code?: string, depth = -1): ResponseInfo[] | undefined {
    const op = this.parser.getOperation(method, path)
    if (!op) return undefined
    const allResponses = this.extractResponses(op, this.parser.getAllSchemas(), depth)
    if (code) return allResponses.filter(r => r.code === code)
    return allResponses
  }

  getEndpointCodes(method: string, path: string): { code: string; description: string }[] | undefined {
    const op = this.parser.getOperation(method, path)
    if (!op) return undefined
    return this.extractCodes(op)
  }

  getSchema(name: string, depth = -1): SchemaInfo | undefined {
    const schema = this.parser.getSchema(name)
    if (!schema) return undefined
    return {
      name,
      fields: schemaToFields(schema, this.parser.getAllSchemas(), depth),
    }
  }

  getSchemaBackRefs(name: string): BackRef[] {
    const refs: BackRef[] = []
    const seen = new Set<string>()

    for (const op of this.parser.getAllOperations()) {
      const key = `${op.method} ${op.path}`

      if (op.requestBody) {
        for (const media of Object.values(op.requestBody.content)) {
          if (hasRef(media.schema as OpenAPIV3.SchemaObject, name)) {
            if (!seen.has(`${key} request`)) {
              refs.push({ method: op.method, path: op.path, location: 'request body' })
              seen.add(`${key} request`)
            }
          }
        }
      }

      for (const [code, resp] of Object.entries(op.responses)) {
        const r = resp as OpenAPIV3.ResponseObject
        for (const media of Object.values(r.content ?? {})) {
          if (hasRef(media.schema as OpenAPIV3.SchemaObject, name)) {
            if (!seen.has(`${key} ${code}`)) {
              refs.push({ method: op.method, path: op.path, location: `response ${code}` })
              seen.add(`${key} ${code}`)
            }
          }
        }
      }
    }

    return refs

    function hasRef(schema: OpenAPIV3.SchemaObject | undefined, target: string): boolean {
      if (!schema) return false
      if (schema.title === target) return true

      if (schema.allOf) {
        for (const entry of schema.allOf) {
          const sub = entry as OpenAPIV3.SchemaObject
          if (sub.title === target) return true
          if (hasRef(sub, target)) return true
        }
      }

      if (schema.properties) {
        for (const prop of Object.values(schema.properties)) {
          const p = prop as OpenAPIV3.SchemaObject
          if (p.title === target) return true
          if (p.type === 'array') {
            const items = p.items as OpenAPIV3.SchemaObject | undefined
            if (items?.title === target) return true
            if (items?.type === 'object' && items.properties) {
              for (const child of Object.values(items.properties)) {
                if ((child as OpenAPIV3.SchemaObject).title === target) return true
              }
            }
          }
          if (p.type === 'object' && p.properties) {
            if (hasRef(p, target)) return true
          }
        }
      }

      return false
    }
  }

  searchEndpoints(keyword: string): EndpointSummary[] {
    return this.parser.searchOperations(keyword).map(op => ({
      method: op.method,
      path: op.path,
      summary: op.summary,
      tags: op.tags.length > 0 ? op.tags : ['Other'],
      deprecated: (op as any).deprecated ?? false,
    }))
  }

  getApiSummary(): ApiSummary {
    return {
      title: this.parser.getTitle(),
      version: this.parser.getVersion(),
      endpoints: this.parser.getEndpointCount(),
      tags: Object.entries(this.parser.getTagEndpointCounts()).map(([name, count]) => ({ name, count })),
      auth: this.parser.requiresAuth() ? Object.values(this.parser.getAuthSchemes()).join(', ') : 'None',
      servers: this.parser.getServers(),
      models: this.parser.getSchemaCount(),
    }
  }

  private extractParams(op: OperationInfo, schemaRegistry: Record<string, OpenAPIV3.SchemaObject>, depth = -1): ParamSection {
    const pathParams: FieldInfo[] = []
    const queryParams: FieldInfo[] = []
    const headerParams: FieldInfo[] = []
    let body: ParamSection['body'] = undefined

    for (const param of op.parameters) {
      const schema = param.schema as OpenAPIV3.SchemaObject | undefined
      if (!schema) continue
      const field: FieldInfo = {
        name: param.name,
        type: getTypeString(schema),
        required: param.required ?? false,
        description: param.description ?? '',
        enumValues: schema.enum as string[] | undefined,
      }

      if (param.in === 'path') pathParams.push(field)
      else if (param.in === 'query') queryParams.push(field)
      else if (param.in === 'header') headerParams.push(field)
    }

    if (op.requestBody) {
      const rb = op.requestBody
      const contentType = Object.keys(rb.content)[0] ?? 'application/json'
      const mediaType = rb.content[contentType]
      body = {
        contentType,
        required: rb.required ?? false,
        fields: sortFields(getMediaTypeFields(mediaType, schemaRegistry, depth)),
      }
    }

    return { pathParams: sortFields(pathParams), queryParams: sortFields(queryParams), headerParams: sortFields(headerParams), body }
  }

  private extractResponses(op: OperationInfo, schemaRegistry: Record<string, OpenAPIV3.SchemaObject>, depth = -1): ResponseInfo[] {
    const result = Object.entries(op.responses).map(([code, response]) => {
      const resp = response as OpenAPIV3.ResponseObject
      const contentType = Object.keys(resp.content ?? {})[0] ?? 'application/json'
      const mediaType = resp.content?.[contentType]
      return {
        code,
        description: resp.description ?? '',
        fields: sortFields(getMediaTypeFields(mediaType, schemaRegistry, depth)),
      }
    })

    return result.sort((a, b) => {
      const na = parseInt(a.code, 10)
      const nb = parseInt(b.code, 10)
      return na - nb
    })
  }

  private extractCodes(op: OperationInfo): { code: string; description: string }[] {
    return Object.entries(op.responses).map(([code, response]) => {
      const resp = response as OpenAPIV3.ResponseObject
      return { code, description: resp.description ?? '' }
    }).sort((a, b) => {
      const na = parseInt(a.code, 10)
      const nb = parseInt(b.code, 10)
      return na - nb
    })
  }
}
