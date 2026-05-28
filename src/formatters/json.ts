import type {
  EndpointSummary, EndpointDetail, FieldInfo,
  ParamSection, ResponseInfo, ApiSummary, SchemaInfo, BackRef
} from '../types.js'

function fieldToJSON(f: FieldInfo): any {
  const obj: any = {
    name: f.name,
    type: f.type,
    required: f.required,
    description: f.description || null,
  }
  if (f.enumValues) obj.enum = f.enumValues
  if (f.readOnly) obj.readOnly = true
  if (f.ref) obj.ref = f.ref
  if (f.children && f.children.length > 0) obj.children = f.children.map(fieldToJSON)
  if (f.oneOf) {
    obj.oneOf = f.oneOf.map(variants => variants.map(fieldToJSON))
  }
  return obj
}

function paramsToJSON(params: ParamSection): any {
  const obj: any = {}
  if (params.pathParams.length > 0) obj.path = params.pathParams.map(fieldToJSON)
  if (params.queryParams.length > 0) obj.query = params.queryParams.map(fieldToJSON)
  if (params.headerParams.length > 0) obj.header = params.headerParams.map(fieldToJSON)
  if (params.body) {
    obj.body = {
      contentType: params.body.contentType,
      required: params.body.required,
      fields: params.body.fields.map(fieldToJSON),
    }
  }
  return obj
}

function responsesToJSON(responses: ResponseInfo[]): any {
  const obj: any = {}
  for (const r of responses) {
    obj[r.code] = {
      description: r.description,
      fields: r.fields.length > 0 ? r.fields.map(fieldToJSON) : [],
    }
  }
  return obj
}

export function formatListingJSON(endpoints: EndpointSummary[]): string {
  return JSON.stringify(endpoints.map(ep => ({
    method: ep.method,
    path: ep.path,
    summary: ep.summary || null,
    tags: ep.tags,
    deprecated: ep.deprecated || false,
  })), null, 2)
}

export function formatDetailJSON(detail: EndpointDetail): string {
  const obj: any = {
    endpoint: { method: detail.method, path: detail.path, summary: detail.summary || null },
    auth: detail.auth,
    parameters: paramsToJSON(detail.params),
    responses: responsesToJSON(detail.responses),
  }
  if (detail.deprecated) {
    obj.deprecated = true
    if (detail.deprecationMessage) obj.deprecationMessage = detail.deprecationMessage
  }
  return JSON.stringify(obj, null, 2)
}

export function formatSearchJSON(results: EndpointSummary[]): string {
  return formatListingJSON(results)
}

export function formatSchemaJSON(schema: SchemaInfo, backRefs?: BackRef[]): string {
  const obj: any = {
    name: schema.name,
    fields: schema.fields.map(fieldToJSON),
  }
  if (backRefs) {
    obj.usedBy = backRefs.map(r => ({
      method: r.method,
      path: r.path,
      location: r.location,
    }))
  }
  return JSON.stringify(obj, null, 2)
}

export function formatSummaryJSON(summary: ApiSummary): string {
  return JSON.stringify({
    title: summary.title,
    version: summary.version,
    endpoints: summary.endpoints,
    tags: summary.tags.map(t => ({ name: t.name, count: t.count })),
    auth: summary.auth,
    servers: summary.servers,
    models: summary.models,
  }, null, 2)
}
