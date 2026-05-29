export interface EndpointSummary {
  method: string
  path: string
  summary: string
  tags: string[]
  deprecated?: boolean
}

export interface FieldInfo {
  name: string
  type: string
  required: boolean

  description: string
  enumValues?: string[]
  ref?: string
  oneOf?: FieldInfo[][]
  items?: FieldInfo
  children?: FieldInfo[]
  defaultValue?: string
  example?: string
}

export interface ParamSection {
  pathParams: FieldInfo[]
  queryParams: FieldInfo[]
  headerParams: FieldInfo[]
  body?: {
    contentType: string
    required: boolean
    fields: FieldInfo[]
  }
}

export interface ResponseInfo {
  code: string
  description: string
  fields: FieldInfo[]
}

export interface EndpointDetail {
  method: string
  path: string
  summary: string
  auth: string
  deprecated?: boolean
  deprecationMessage?: string
  params: ParamSection
  responses: ResponseInfo[]
  codes: { code: string; description: string }[]
}

export interface BackRef {
  method: string
  path: string
  location: string
}

export interface ApiSummary {
  title: string
  version: string
  endpoints: number
  tags: { name: string; count: number }[]
  auth: string
  servers: string[]
  models: number
}

export interface SchemaInfo {
  name: string
  fields: FieldInfo[]
}
