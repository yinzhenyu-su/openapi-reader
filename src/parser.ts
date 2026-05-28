import SwaggerParser from '@apidevtools/swagger-parser'
import type { OpenAPIV3 } from 'openapi-types'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | 'TRACE'

function getCachePath(specPath: string): string | null {
  if (!specPath.startsWith('http://') && !specPath.startsWith('https://')) return null
  const hash = createHash('md5').update(specPath).digest('hex')
  const cacheDir = join(homedir(), '.cache', 'openapi-reader')
  return join(cacheDir, `${hash}.json`)
}

function isCachedValid(cachePath: string): boolean {
  if (!existsSync(cachePath)) return false
  const stat = existsSync(cachePath) ? readFileSync(cachePath, 'utf-8') : null
  if (!stat) return false
  try {
    const meta = JSON.parse(readFileSync(cachePath, 'utf-8'))
    if (meta._cachedAt) {
      const age = Date.now() - meta._cachedAt
      return age < 3600_000
    }
  } catch {
    // ignore parse error
  }
  return false
}

export interface OperationInfo {
  path: string
  method: HttpMethod
  summary: string
  description: string
  tags: string[]
  parameters: OpenAPIV3.ParameterObject[]
  requestBody: OpenAPIV3.RequestBodyObject | undefined
  responses: Record<string, OpenAPIV3.ResponseObject>
  security: OpenAPIV3.SecurityRequirementObject[] | undefined
  deprecated: boolean
  deprecationMessage: string | undefined
}

export class OpenApiParser {
  private doc!: OpenAPIV3.Document

  async load(specPath: string, noCache = false): Promise<void> {
    const cachePath = getCachePath(specPath)

    if (cachePath && !noCache && isCachedValid(cachePath)) {
      try {
        const cached = JSON.parse(readFileSync(cachePath, 'utf-8'))
        if (cached._openapi || cached.openapi) {
          this.doc = cached as OpenAPIV3.Document
          return
        }
      } catch {
        // ignore parse error
      }
    }

    let raw: any

    if (cachePath && !noCache && isCachedValid(cachePath)) {
      try {
        raw = JSON.parse(readFileSync(cachePath, 'utf-8'))
        delete raw._cachedAt
        delete raw._source
      } catch {
        // ignore parse error
      }
    }

    if (!raw) {
      raw = await SwaggerParser.parse(specPath) as any
      if (!('openapi' in raw)) {
        throw new Error('Only OpenAPI 3.0 is supported. The spec appears to be Swagger 2.0.')
      }

      if (cachePath) {
        try {
          const cachedDir = join(homedir(), '.cache', 'openapi-reader')
          if (!existsSync(cachedDir)) mkdirSync(cachedDir, { recursive: true })
          writeFileSync(cachePath, JSON.stringify({ ...raw, _cachedAt: Date.now(), _source: specPath }), 'utf-8')
        } catch {
          // ignore write error
        }
      }
    }

    if (raw.components?.schemas) {
      for (const [name, schema] of Object.entries(raw.components.schemas)) {
        const s = schema as any
        if (!s.title) s.title = name
      }
    }

    this.doc = await SwaggerParser.dereference(raw) as OpenAPIV3.Document
  }

  getTitle(): string {
    return this.doc.info?.title ?? ''
  }

  getVersion(): string {
    return this.doc.info?.version ?? ''
  }

  getServers(): string[] {
    return this.doc.servers?.map(s => s.url) ?? []
  }

  getTags(): string[] {
    return this.doc.tags?.map(t => t.name) ?? []
  }

  getAuthSchemes(): Record<string, string> {
    const schemes = this.doc.components?.securitySchemes ?? {}
    const result: Record<string, string> = {}
    for (const [name, scheme] of Object.entries(schemes)) {
      const s = scheme as OpenAPIV3.SecuritySchemeObject
      if (s.type === 'http' && s.scheme === 'bearer') {
        result[name] = 'Bearer token (Authorization header)'
      } else if (s.type === 'http' && s.scheme === 'basic') {
        result[name] = 'Basic auth'
      } else if (s.type === 'apiKey') {
        const inLoc = s.in === 'header' ? 'Header' : s.in === 'query' ? 'Query param' : s.in
        result[name] = `${s.name} (${inLoc})`
      } else if (s.type === 'oauth2') {
        result[name] = 'OAuth2'
      } else if (s.type === 'openIdConnect') {
        result[name] = `OpenID Connect (${s.openIdConnectUrl})`
      } else {
        result[name] = `${name} (${(s as any).type})`
      }
    }
    return result
  }

  requiresAuth(opSecurity?: OpenAPIV3.SecurityRequirementObject[]): boolean {
    if (opSecurity !== undefined) {
      return opSecurity.length > 0
    }
    const globalSec = this.doc.security
    return globalSec !== undefined && globalSec.length > 0
  }

  getAuthSummary(): string {
    const schemes = this.getAuthSchemes()
    if (Object.keys(schemes).length === 0) return 'None'

    const globalSec = this.doc.security
    if (!globalSec || globalSec.length === 0) {
      return `Optional: ${Object.values(schemes).join(', ')}`
    }
    return Object.values(schemes).join(', ')
  }

  getAllOperations(): OperationInfo[] {
    const result: OperationInfo[] = []
    const methods: string[] = [
      'get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'
    ]

    for (const [path, pathItem] of Object.entries(this.doc.paths ?? {})) {
      if (!pathItem) continue
      const pio = pathItem as OpenAPIV3.PathItemObject
      const pathLevelParams: OpenAPIV3.ParameterObject[] = pio.parameters as OpenAPIV3.ParameterObject[] ?? []

      for (const method of methods) {
        const operation = (pio as any)[method] as OpenAPIV3.OperationObject | undefined
        if (!operation) continue

        const allParams: OpenAPIV3.ParameterObject[] = [
          ...pathLevelParams,
          ...(operation.parameters as OpenAPIV3.ParameterObject[] ?? [])
        ]

        const extDocs = operation.externalDocs
        const deprecationMsg = extDocs?.description ??
          (operation.deprecated ? 'This endpoint is deprecated' : undefined)

        result.push({
          path,
          method: method.toUpperCase() as HttpMethod,
          summary: operation.summary ?? '',
          description: operation.description ?? '',
          tags: operation.tags ?? [],
          parameters: allParams,
          requestBody: operation.requestBody as OpenAPIV3.RequestBodyObject | undefined,
          responses: operation.responses as Record<string, OpenAPIV3.ResponseObject> ?? {},
          security: operation.security,
          deprecated: operation.deprecated ?? false,
          deprecationMessage: deprecationMsg,
        })
      }
    }
    return result
  }

  getOperation(method: string, path: string): OperationInfo | undefined {
    return this.getAllOperations().find(
      op => op.method === method.toUpperCase() && op.path === path
    )
  }

  getSchemaNames(): string[] {
    return Object.keys(this.doc.components?.schemas ?? {})
  }

  getSchema(name: string): OpenAPIV3.SchemaObject | undefined {
    return this.doc.components?.schemas?.[name] as OpenAPIV3.SchemaObject | undefined
  }

  getAllSchemas(): Record<string, OpenAPIV3.SchemaObject> {
    return this.doc.components?.schemas as Record<string, OpenAPIV3.SchemaObject> ?? {}
  }

  getSchemaCount(): number {
    return Object.keys(this.doc.components?.schemas ?? {}).length
  }

  getEndpointCount(): number {
    let count = 0
    for (const [, pathItem] of Object.entries(this.doc.paths ?? {})) {
      if (!pathItem) continue
      const methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']
      for (const method of methods) {
        if ((pathItem as any)[method]) count++
      }
    }
    return count
  }

  getTagEndpointCounts(): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const op of this.getAllOperations()) {
      const tags = op.tags.length > 0 ? op.tags : ['Other']
      for (const tag of tags) {
        counts[tag] = (counts[tag] ?? 0) + 1
      }
    }
    return counts
  }

  searchOperations(keyword: string): OperationInfo[] {
    const lower = keyword.toLowerCase()
    return this.getAllOperations().filter(op => {
      if (op.path.toLowerCase().includes(lower)) return true
      if (op.summary.toLowerCase().includes(lower)) return true
      if (op.description.toLowerCase().includes(lower)) return true
      if (op.tags.some(t => t.toLowerCase().includes(lower))) return true
      return false
    })
  }
}
