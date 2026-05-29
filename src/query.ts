import type { OpenAPIV3 } from 'openapi-types'
import { type OperationInfo, OpenApiParser } from './parser.js'
import type {
  EndpointSummary, EndpointDetail, FieldInfo,
  ParamSection, ResponseInfo, ApiSummary, SchemaInfo, BackRef
} from './types.js'

const KNOWN_TYPES = new Set(['int', 'bool', 'string', 'datetime', 'binary', 'array', 'object', 'oneOf', 'anyOf', 'any'])

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
  visited: Set<string> = new Set()
): FieldInfo[] {
  const resolved = mergeAllOf(schema)

  if (resolved.type === 'array') {
    const items = resolved.items as OpenAPIV3.SchemaObject | undefined
    if (items?.type === 'object' && items.properties) {
      return schemaToFields(items, schemaRegistry, visited)
    }
  }

  if (!resolved.properties) return []
  const requiredSet = new Set(resolved.required ?? [])

  return Object.entries(resolved.properties).map(([name, prop]) => {
    const propSchema = prop as OpenAPIV3.SchemaObject
    const typeStr = getTypeString(propSchema)
    const isKnownType = KNOWN_TYPES.has(typeStr) || typeStr.endsWith('[]')
    const field: FieldInfo = {
      name,
      type: typeStr,
      required: requiredSet.has(name),

      description: propSchema.description ?? '',
      enumValues: propSchema.enum as string[] | undefined,
      defaultValue: propSchema.default != null ? String(propSchema.default) : undefined,
      example: propSchema.example != null ? String(propSchema.example) : undefined,
      ref: isKnownType ? undefined : typeStr,
    }

    if (propSchema.oneOf && propSchema.oneOf.length > 0) {
      field.oneOf = propSchema.oneOf.map(variant => {
        const v = variant as OpenAPIV3.SchemaObject
        return schemaToFields(v, schemaRegistry, visited)
      })
    }

    if (propSchema.properties) {
      if ((typeStr === 'object' || !isKnownType) && !typeStr.endsWith('[]')) {
        const schemaName = propSchema.title && propSchema.title !== typeStr ? propSchema.title : typeStr
        if (visited.has(schemaName)) {
          field.ref = schemaName
        } else {
          visited.add(schemaName)
          field.children = schemaToFields(propSchema, schemaRegistry, visited)
          visited.delete(schemaName)
        }
      }
    }

    if (propSchema.type === 'array') {
      const items = propSchema.items as OpenAPIV3.SchemaObject | undefined
      if (items && items.type === 'object' && items.properties) {
        const schemaName = items.title
        if (schemaName && visited.has(schemaName)) {
          field.ref = schemaName
        } else {
          if (schemaName) visited.add(schemaName)
          field.children = schemaToFields(items, schemaRegistry, visited)
          if (schemaName) visited.delete(schemaName)
        }
      }
    }

    if (propSchema.type === 'object' && !propSchema.properties && propSchema.title) {
      const schemaName = propSchema.title
      if (visited.has(schemaName)) {
        field.ref = schemaName
      } else {
        const refSchema = schemaRegistry[schemaName]
        if (refSchema) {
          visited.add(schemaName)
          field.children = schemaToFields(refSchema, schemaRegistry, visited)
          visited.delete(schemaName)
        } else {
          field.ref = schemaName
        }
      }
    }

    return field
  })
}

function getMediaTypeFields(
  mediaType: OpenAPIV3.MediaTypeObject | undefined,
  schemaRegistry: Record<string, OpenAPIV3.SchemaObject>
): FieldInfo[] {
  if (!mediaType?.schema) return []
  const schema = mediaType.schema as OpenAPIV3.SchemaObject
  return schemaToFields(schema, schemaRegistry)
}

function sortFields(fields: FieldInfo[]): FieldInfo[] {
  const priority = (f: FieldInfo): number => {
    if (f.required) return 0

    return 1
  }
  return [...fields].sort((a, b) => {
    const pa = priority(a)
    const pb = priority(b)
    if (pa !== pb) return pa - pb
    return a.name.localeCompare(b.name)
  })
}

function fieldMatches(f: FieldInfo, lower: string, exact = false): boolean {
  if (exact) {
    return f.name.toLowerCase() === lower
  }
  return f.name.toLowerCase().includes(lower) ||
    !!(f.description && f.description.toLowerCase().includes(lower))
}

function filterFieldsWithOneOf(fields: FieldInfo[], lower: string, exact = false): FieldInfo[] {
  const matched: FieldInfo[] = []
  for (const f of fields) {
    if (fieldMatches(f, lower, exact)) {
      matched.push(f)
    } else if (f.oneOf) {
      for (const variant of f.oneOf) {
        if (variant.some(v => fieldMatches(v, lower, exact))) {
          matched.push(f)
          break
        }
      }
    }
  }
  return matched
}

export class QueryEngine {
  private parser: OpenApiParser

  constructor(parser: OpenApiParser) {
    this.parser = parser
  }

  getEndpointSummary(filters?: { tag?: string[]; url?: string; method?: string; deprecated?: boolean }): EndpointSummary[] {
    let ops = this.parser.getAllOperations()

    if (filters?.tag && filters.tag.length > 0) {
      ops = ops.filter(op => op.tags.some(t =>
        filters.tag!.some(f => t.toLowerCase().includes(f.toLowerCase()))
      ))
    }
    if (filters?.url) {
      const lower = filters.url.toLowerCase()
      ops = ops.filter(op => op.path.toLowerCase().includes(lower))
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

  getMatchingEndpoints(inputPath: string): EndpointSummary[] {
    const normalized = inputPath.toLowerCase().replace(/\/+$/, '')
    const exact = this.parser.getAllOperations().filter(op => op.path.toLowerCase() === normalized)
    if (exact.length > 0) {
      return exact.map(op => ({
        method: op.method, path: op.path, summary: op.summary,
        tags: op.tags.length > 0 ? op.tags : ['Other'],
        deprecated: op.deprecated ?? false,
      }))
    }
    const segments = normalized.split('/')
    const fuzzy = this.parser.getAllOperations().filter(op => {
      const opLower = op.path.toLowerCase()
      if (opLower.includes(normalized)) return true
      if (normalized.includes(opLower)) return true
      const opSegs = opLower.split('/')
      return segments.every(s => s === '' || opSegs.some(os => os.includes(s)))
    })
    return fuzzy.map(op => ({
      method: op.method, path: op.path, summary: op.summary,
      tags: op.tags.length > 0 ? op.tags : ['Other'],
      deprecated: op.deprecated ?? false,
    }))
  }

  getEndpointPathsMatching(inputPath: string): { path: string; methods: string[] }[] {
    const normalized = inputPath.toLowerCase().replace(/\/+$/, '')
    const withSlash = normalized.startsWith('/') ? normalized : `/${normalized}`
    const allOps = this.parser.getAllOperations()
    const exactMatch = allOps.filter(op => op.path.toLowerCase() === withSlash)
    if (exactMatch.length > 0) {
      const map = new Map<string, string[]>()
      for (const op of exactMatch) {
        if (!map.has(op.path)) map.set(op.path, [])
        map.get(op.path)!.push(op.method)
      }
      return [...map.entries()].map(([path, methods]) => ({ path, methods }))
    }
    const fuzzy = allOps.filter(op => op.path.toLowerCase().includes(normalized) || normalized.includes(op.path.toLowerCase()))
    if (fuzzy.length > 0) {
      const map = new Map<string, string[]>()
      for (const op of fuzzy) {
        if (!map.has(op.path)) map.set(op.path, [])
        map.get(op.path)!.push(op.method)
      }
      return [...map.entries()].map(([path, methods]) => ({ path, methods }))
    }
    return []
  }

  getEndpointDetail(method: string, path: string): EndpointDetail | undefined {
    const op = this.parser.getOperation(method, path)
    if (!op) return undefined

    const schemaRegistry = this.parser.getAllSchemas()
    const params = this.extractParams(op, schemaRegistry)
    const responses = this.extractResponses(op, schemaRegistry)
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

  getEndpointParams(method: string, path: string): ParamSection | undefined {
    const op = this.parser.getOperation(method, path)
    if (!op) return undefined
    return this.extractParams(op, this.parser.getAllSchemas())
  }

  getEndpointResponses(method: string, path: string, code?: string): ResponseInfo[] | undefined {
    const op = this.parser.getOperation(method, path)
    if (!op) return undefined
    const allResponses = this.extractResponses(op, this.parser.getAllSchemas())
    if (code) return allResponses.filter(r => r.code === code)
    return allResponses
  }

  getEndpointCodes(method: string, path: string): { code: string; description: string }[] | undefined {
    const op = this.parser.getOperation(method, path)
    if (!op) return undefined
    return this.extractCodes(op)
  }

  getSchemaNames(): string[] {
    return Object.keys(this.parser.getAllSchemas())
  }

  getSchemaList(): { name: string; description: string }[] {
    const schemas = this.parser.getAllSchemas()
    return Object.entries(schemas).map(([name, schema]) => ({
      name,
      description: schema.description ?? '',
    })).sort((a, b) => a.name.localeCompare(b.name))
  }

  getSchema(name: string): SchemaInfo | undefined {
    const schema = this.parser.getSchema(name)
    if (!schema) return undefined
    return {
      name,
      fields: schemaToFields(schema, this.parser.getAllSchemas()),
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

  searchFields(keyword: string, exact = false): { schema: string; fields: FieldInfo[] }[] {
    const lower = keyword.toLowerCase()
    const results: { schema: string; fields: FieldInfo[] }[] = []

    for (const [name, schema] of Object.entries(this.parser.getAllSchemas())) {
      const fields = schemaToFields(schema, this.parser.getAllSchemas())
      const matched = filterFieldsWithOneOf(fields, lower, exact)
      if (matched.length > 0) {
        results.push({ schema: name, fields: matched })
      }
    }

    return results.sort((a, b) => a.schema.localeCompare(b.schema))
  }

  searchEndpointFields(keyword: string, exact = false): { method: string; path: string; fields: FieldInfo[] }[] {
    const lower = keyword.toLowerCase()
    const results: { method: string; path: string; fields: FieldInfo[] }[] = []

    for (const op of this.parser.getAllOperations()) {
      const schemaRegistry = this.parser.getAllSchemas()
      const params = this.extractParams(op, schemaRegistry)
      const allFields: FieldInfo[] = [
        ...params.pathParams,
        ...params.queryParams,
        ...params.headerParams,
        ...(params.body?.fields ?? []),
      ]

      const matched = filterFieldsWithOneOf(allFields, lower, exact)
      if (matched.length > 0) {
        results.push({ method: op.method, path: op.path, fields: matched })
      }
    }

    return results.sort((a, b) => a.path.localeCompare(b.path))
  }

  generateExample(schema: OpenAPIV3.SchemaObject, visited = new Set<string>()): any {
    if (schema.allOf) {
      schema = mergeAllOf(schema)
    }

    if (schema.example !== undefined && schema.example !== null) return schema.example

    if (schema.enum && schema.enum.length > 0) return schema.enum[0]

    if (schema.oneOf && schema.oneOf.length > 0) {
      return this.generateExample(schema.oneOf[0] as OpenAPIV3.SchemaObject, visited)
    }
    if (schema.anyOf && schema.anyOf.length > 0) {
      return this.generateExample(schema.anyOf[0] as OpenAPIV3.SchemaObject, visited)
    }

    const type = schema.type

    if (type === 'array') {
      const items = schema.items as OpenAPIV3.SchemaObject | undefined
      if (!items) return []
      return [this.generateExample(items, visited)]
    }

    if (type === 'object' || (!type && schema.properties)) {
      const title = schema.title
      if (title && visited.has(title)) return {}
      if (title) visited.add(title)

      const obj: Record<string, any> = {}
      const required = new Set(schema.required ?? [])
      const properties = schema.properties ?? {}
      for (const [name, prop] of Object.entries(properties)) {
        if (required.has(name)) {
          obj[name] = this.generateExample(prop as OpenAPIV3.SchemaObject, visited)
        }
      }

      if (title) visited.delete(title)
      return obj
    }

    if (type === 'string') {
      if (schema.format === 'date-time') return '2024-01-01T00:00:00Z'
      if (schema.format === 'date') return '2024-01-01'
      if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000'
      if (schema.format === 'email') return 'user@example.com'
      if (schema.format === 'uri') return 'https://example.com'
      if (schema.format === 'binary') return '<binary>'
      if (schema.format === 'password') return '********'
      return 'string'
    }

    if (type === 'integer') return 0
    if (type === 'number') return 0
    if (type === 'boolean') return false

    return null
  }

  generateEndpointExamples(method: string, path: string): { request?: any; responses: Record<string, any> } | undefined {
    const op = this.parser.getOperation(method, path)
    if (!op) return undefined

    const result: { request?: any; responses: Record<string, any> } = { responses: {} }

    if (op.requestBody) {
      const contentType = Object.keys(op.requestBody.content)[0]
      const mediaType = op.requestBody.content[contentType]
      if (mediaType?.schema) {
        result.request = this.generateExample(mediaType.schema as OpenAPIV3.SchemaObject)
      }
    }

    for (const [code, resp] of Object.entries(op.responses)) {
      const r = resp as OpenAPIV3.ResponseObject
      const contentType = Object.keys(r.content ?? {})[0]
      const mediaType = r.content?.[contentType]
      if (mediaType?.schema) {
        result.responses[code] = this.generateExample(mediaType.schema as OpenAPIV3.SchemaObject)
      }
    }

    return result
  }

  getApiSummary(): ApiSummary {
    const methodCounts: Record<string, number> = {}
    for (const op of this.parser.getAllOperations()) {
      methodCounts[op.method] = (methodCounts[op.method] ?? 0) + 1
    }
    const methods = Object.entries(methodCounts)
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => a.method.localeCompare(b.method))

    return {
      title: this.parser.getTitle(),
      version: this.parser.getVersion(),
      endpoints: this.parser.getEndpointCount(),
      tags: Object.entries(this.parser.getTagEndpointCounts()).map(([name, count]) => ({ name, count })),
      methods,
      auth: this.parser.requiresAuth() ? Object.values(this.parser.getAuthSchemes()).join(', ') : 'None',
      servers: this.parser.getServers(),
      models: this.parser.getSchemaCount(),
    }
  }

  private extractParams(op: OperationInfo, schemaRegistry: Record<string, OpenAPIV3.SchemaObject>): ParamSection {
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
        defaultValue: schema.default != null ? String(schema.default) : undefined,
        example: schema.example != null ? String(schema.example) : undefined,
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
        fields: sortFields(getMediaTypeFields(mediaType, schemaRegistry)),
      }
    }

    return { pathParams: sortFields(pathParams), queryParams: sortFields(queryParams), headerParams: sortFields(headerParams), body }
  }

  private extractResponses(op: OperationInfo, schemaRegistry: Record<string, OpenAPIV3.SchemaObject>): ResponseInfo[] {
    const result = Object.entries(op.responses).map(([code, response]) => {
      const resp = response as OpenAPIV3.ResponseObject
      const contentType = Object.keys(resp.content ?? {})[0] ?? 'application/json'
      const mediaType = resp.content?.[contentType]
      return {
        code,
        description: resp.description ?? '',
        fields: sortFields(getMediaTypeFields(mediaType, schemaRegistry)),
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
