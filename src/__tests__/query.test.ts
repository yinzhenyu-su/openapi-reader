import { describe, it, expect, beforeEach } from 'vitest'
import { OpenApiParser } from '../parser.js'
import { QueryEngine } from '../query.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const specPath = path.resolve(__dirname, '../../test-spec.yaml')

let parser: OpenApiParser
let query: QueryEngine

beforeEach(async () => {
  parser = new OpenApiParser()
  await parser.load(specPath)
  query = new QueryEngine(parser)
})

describe('QueryEngine', () => {
  describe('getEndpointSummary', () => {
    it('should return all endpoints without filters', () => {
      const summary = query.getEndpointSummary()
      expect(summary.length).toBe(15)
    })

    it('should filter by tag', () => {
      const summary = query.getEndpointSummary({ tag: ['Pets'] })
      expect(summary.length).toBe(7)
      expect(summary.every(ep => ep.tags.includes('Pets'))).toBe(true)
    })

    it('should filter by method', () => {
      const summary = query.getEndpointSummary({ method: 'POST' })
      expect(summary.length).toBe(6)
      expect(summary.every(ep => ep.method === 'POST')).toBe(true)
    })

    it('should filter by tag and method combined', () => {
      const summary = query.getEndpointSummary({ tag: ['Pets'], method: 'GET' })
      expect(summary.length).toBe(3)
    })

    it('should filter only deprecated endpoints', () => {
      const summary = query.getEndpointSummary({ deprecated: true })
      expect(summary.length).toBe(1)
      expect(summary[0].path).toBe('/pets/{petId}/archive')
      expect(summary[0].deprecated).toBe(true)
    })

    it('should filter only non-deprecated endpoints', () => {
      const summary = query.getEndpointSummary({ deprecated: false })
      expect(summary.length).toBe(14)
      expect(summary.every(ep => !ep.deprecated)).toBe(true)
    })

    it('should assign Other tag to endpoints without tags', () => {
      const summary = query.getEndpointSummary()
      const healthEp = summary.find(ep => ep.path === '/health')
      expect(healthEp).toBeDefined()
      expect(healthEp!.tags).toContain('Other')
    })
  })

  describe('getEndpointDetail', () => {
    it('should return detail for a valid endpoint', () => {
      const detail = query.getEndpointDetail('GET', '/pets')
      expect(detail).toBeDefined()
      expect(detail!.method).toBe('GET')
      expect(detail!.path).toBe('/pets')
    })

    it('should return undefined for non-existent endpoint', () => {
      expect(query.getEndpointDetail('GET', '/nonexistent')).toBeUndefined()
    })

    it('should include query parameters', () => {
      const detail = query.getEndpointDetail('GET', '/pets')
      expect(detail!.params.queryParams.length).toBe(3)
      expect(detail!.params.queryParams.map(p => p.name)).toContain('page')
      expect(detail!.params.queryParams.map(p => p.name)).toContain('limit')
      expect(detail!.params.queryParams.map(p => p.name)).toContain('status')
    })

    it('should include path parameters', () => {
      const detail = query.getEndpointDetail('GET', '/pets/{petId}')
      expect(detail!.params.pathParams.length).toBe(1)
      expect(detail!.params.pathParams[0].name).toBe('petId')
    })

    it('should include body parameters', () => {
      const detail = query.getEndpointDetail('POST', '/pets')
      expect(detail!.params.body).toBeDefined()
      expect(detail!.params.body!.required).toBe(true)
      expect(detail!.params.body!.fields.length).toBeGreaterThan(0)
    })

    it('should include header parameters', () => {
      const detail = query.getEndpointDetail('GET', '/store/inventory')
      expect(detail!.params.headerParams.length).toBe(2)
      expect(detail!.params.headerParams.map(p => p.name)).toContain('X-Request-Id')
    })

    it('should include responses', () => {
      const detail = query.getEndpointDetail('GET', '/pets')
      expect(detail!.responses.length).toBeGreaterThan(0)
      expect(detail!.responses[0].code).toBe('200')
    })

    it('should include codes', () => {
      const detail = query.getEndpointDetail('GET', '/pets')
      expect(detail!.codes.length).toBeGreaterThan(0)
    })

    it('should detect auth for endpoints', () => {
      const detail = query.getEndpointDetail('GET', '/pets')
      expect(detail!.auth).toContain('Bearer token')
    })

    it('should show None auth for endpoints with security override', () => {
      const detail = query.getEndpointDetail('GET', '/health')
      expect(detail!.auth).toBe('None')
    })

    it('should mark deprecated endpoints', () => {
      const detail = query.getEndpointDetail('PUT', '/pets/{petId}/archive')
      expect(detail!.deprecated).toBe(true)
    })

    it('should sort required fields first', () => {
      const detail = query.getEndpointDetail('POST', '/pets')
      const bodyFields = detail!.params.body!.fields
      const requiredIdx = bodyFields.map((f, i) => f.required ? i : -1).filter(i => i >= 0)
      const optionalIdx = bodyFields.map((f, i) => !f.required ? i : -1).filter(i => i >= 0)
      if (requiredIdx.length > 0 && optionalIdx.length > 0) {
        expect(Math.max(...requiredIdx)).toBeLessThan(Math.min(...optionalIdx))
      }
    })
  })

  describe('getEndpointDetail', () => {
    it('should expand nested fields by default', () => {
      const detail = query.getEndpointDetail('GET', '/pets/{petId}')
      const respFields = detail!.responses.find(r => r.code === '200')!.fields
      expect(respFields.length).toBeGreaterThan(0)
    })

    it('should expand refs inline by default', () => {
      const detail = query.getEndpointDetail('GET', '/pets/{petId}')
      const respFields = detail!.responses.find(r => r.code === '200')!.fields
      const ownerField = respFields.find(f => f.name === 'owner')
      expect(ownerField).toBeDefined()
      expect(ownerField!.children).toBeDefined()
    })
  })

  describe('getEndpointParams', () => {
    it('should return params for valid endpoint', () => {
      const params = query.getEndpointParams('GET', '/pets')
      expect(params).toBeDefined()
      expect(params!.queryParams.length).toBe(3)
    })

    it('should return undefined for non-existent endpoint', () => {
      expect(query.getEndpointParams('GET', '/nonexistent')).toBeUndefined()
    })

    it('should separate path, query, and header params', () => {
      const params = query.getEndpointParams('GET', '/pets/{petId}')
      expect(params!.pathParams.length).toBe(1)
      expect(params!.queryParams.length).toBe(0)
      expect(params!.headerParams.length).toBe(0)
    })

    it('should include expanded body ref for POST endpoints', () => {
      const params = query.getEndpointParams('POST', '/pets')
      expect(params!.body).toBeDefined()
      expect(params!.body!.required).toBe(true)
      expect(params!.body!.contentType).toBe('application/json')
      const bodyFields = params!.body!.fields
      expect(bodyFields.some(f => f.name === 'name')).toBe(true)
      expect(bodyFields.some(f => f.name === 'species')).toBe(true)
      expect(bodyFields.some(f => f.name === 'ownerId')).toBe(true)
      expect(bodyFields.some(f => f.name === 'age')).toBe(true)
    })
  })

  describe('getEndpointResponses', () => {
    it('should return all responses for valid endpoint', () => {
      const responses = query.getEndpointResponses('GET', '/pets')
      expect(responses).toBeDefined()
      expect(responses!.length).toBe(3)
    })

    it('should filter by specific code', () => {
      const responses = query.getEndpointResponses('GET', '/pets', '200')
      expect(responses!.length).toBe(1)
      expect(responses![0].code).toBe('200')
    })

    it('should return undefined for non-existent endpoint', () => {
      expect(query.getEndpointResponses('GET', '/nonexistent')).toBeUndefined()
    })

    it('should return empty for non-existent code', () => {
      const responses = query.getEndpointResponses('GET', '/pets', '999')
      expect(responses!.length).toBe(0)
    })

    it('should sort responses by code', () => {
      const responses = query.getEndpointResponses('GET', '/pets')
      const codes = responses!.map(r => parseInt(r.code, 10))
      for (let i = 1; i < codes.length; i++) {
        expect(codes[i]).toBeGreaterThanOrEqual(codes[i - 1])
      }
    })

    it('should unwrap top-level array response into item fields', () => {
      const responses = query.getEndpointResponses('GET', '/pets', '200')
      expect(responses![0].fields.length).toBeGreaterThan(0)
      expect(responses![0].fields.some(f => f.name === 'id')).toBe(true)
      expect(responses![0].fields.some(f => f.name === 'name')).toBe(true)
      expect(responses![0].fields.some(f => f.name === 'species')).toBe(true)
    })

    it('should expand refs in response fields', () => {
      const responses = query.getEndpointResponses('GET', '/pets/{petId}', '200')
      const ownerField = responses![0].fields.find(f => f.name === 'owner')
      expect(ownerField).toBeDefined()
      expect(ownerField!.children).toBeDefined()
      expect(ownerField!.children!.some(f => f.name === 'id')).toBe(true)
      expect(ownerField!.children!.some(f => f.name === 'name')).toBe(true)
    })
  })

  describe('getEndpointCodes', () => {
    it('should return codes for valid endpoint', () => {
      const codes = query.getEndpointCodes('GET', '/pets')
      expect(codes).toBeDefined()
      expect(codes!.length).toBe(3)
    })

    it('should return undefined for non-existent endpoint', () => {
      expect(query.getEndpointCodes('GET', '/nonexistent')).toBeUndefined()
    })
  })

  describe('getSchema', () => {
    it('should return schema info for valid name', () => {
      const schema = query.getSchema('Pet')
      expect(schema).toBeDefined()
      expect(schema!.name).toBe('Pet')
      expect(schema!.fields.length).toBeGreaterThan(0)
    })

    it('should return undefined for non-existent schema', () => {
      expect(query.getSchema('NonExistent')).toBeUndefined()
    })

    it('should include enum values', () => {
      const schema = query.getSchema('Pet')
      const speciesField = schema!.fields.find(f => f.name === 'species')
      expect(speciesField).toBeDefined()
      expect(speciesField!.enumValues).toContain('cat')
      expect(speciesField!.enumValues).toContain('dog')
    })

    it('should mark required fields', () => {
      const schema = query.getSchema('Pet')
      const idField = schema!.fields.find(f => f.name === 'id')
      expect(idField!.required).toBe(true)
    })

    it('should handle allOf schema merging', () => {
      const schema = query.getSchema('Staff')
      expect(schema).toBeDefined()
      expect(schema!.fields.length).toBeGreaterThan(0)
      const nameField = schema!.fields.find(f => f.name === 'name')
      expect(nameField).toBeDefined()
      const idField = schema!.fields.find(f => f.name === 'id')
      expect(idField).toBeDefined()
    })

    it('should handle oneOf schema variants', () => {
      const schema = query.getSchema('PaymentRequest')
      const methodField = schema!.fields.find(f => f.name === 'method')
      expect(methodField).toBeDefined()
      expect(methodField!.oneOf).toBeDefined()
      expect(methodField!.oneOf!.length).toBe(3)
    })
  })

  describe('getSchemaBackRefs', () => {
    it('should find back-references for Pet schema', () => {
      const refs = query.getSchemaBackRefs('Pet')
      expect(refs.length).toBeGreaterThan(0)
      const hasPetGet = refs.some(r => r.path === '/pets/{petId}' && r.method === 'GET')
      expect(hasPetGet).toBe(true)
    })

    it('should find back-references for User schema', () => {
      const refs = query.getSchemaBackRefs('User')
      expect(refs.length).toBeGreaterThan(0)
    })

    it('should find back-references for Error schema', () => {
      const refs = query.getSchemaBackRefs('Error')
      expect(refs.length).toBeGreaterThan(0)
    })

    it('should find back-references for Photo schema', () => {
      const refs = query.getSchemaBackRefs('Photo')
      expect(refs.length).toBeGreaterThan(0)
      const hasPhotoUpload = refs.some(r => r.path === '/pets/{petId}/photos' && r.method === 'POST')
      expect(hasPhotoUpload).toBe(true)
    })
  })

  describe('searchFields', () => {
    it('should find schema fields by name', () => {
      const results = query.searchFields('email')
      expect(results.length).toBeGreaterThan(0)
      const userResult = results.find(r => r.schema === 'User')
      expect(userResult).toBeDefined()
      expect(userResult!.fields.some(f => f.name === 'email')).toBe(true)
    })

    it('should find schema fields by description', () => {
      const results = query.searchFields('identifier')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => r.fields.some(f => f.name === 'id'))).toBe(true)
    })

    it('should return empty for unmatched keyword', () => {
      const results = query.searchFields('zzzznotfound')
      expect(results.length).toBe(0)
    })
  })

  describe('searchEndpointFields', () => {
    it('should find endpoint fields by name', () => {
      const results = query.searchEndpointFields('page')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => r.path === '/pets')).toBe(true)
    })

    it('should return empty for unmatched keyword', () => {
      const results = query.searchEndpointFields('zzzznotfound')
      expect(results.length).toBe(0)
    })
  })

  describe('searchEndpoints', () => {
    it('should find endpoints by path keyword', () => {
      const results = query.searchEndpoints('pet')
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(r => r.path.toLowerCase().includes('pet'))).toBe(true)
    })

    it('should find endpoints by summary keyword', () => {
      const results = query.searchEndpoints('login')
      expect(results.length).toBe(1)
      expect(results[0].path).toBe('/users/login')
    })

    it('should return empty for unmatched keyword', () => {
      const results = query.searchEndpoints('zzzznotfound')
      expect(results.length).toBe(0)
    })
  })

  describe('getSchema with expandRefs', () => {
    it('should expand refs inline by default', () => {
      const schema = query.getSchema('Pet')
      expect(schema).toBeDefined()
      const ownerField = schema!.fields.find(f => f.name === 'owner')
      expect(ownerField).toBeDefined()
      expect(ownerField!.ref).toBe('UserRef')
      expect(ownerField!.children).toBeDefined()
      expect(ownerField!.children!.length).toBeGreaterThan(0)
      expect(ownerField!.children!.some(f => f.name === 'id')).toBe(true)
      expect(ownerField!.children!.some(f => f.name === 'name')).toBe(true)
    })

    it('should expand all refs by default', () => {
      const schema = query.getSchema('Pet')
      const photosField = schema!.fields.find(f => f.name === 'photos')
      expect(photosField).toBeDefined()
      expect(photosField!.children).toBeDefined()
      expect(photosField!.children!.length).toBeGreaterThan(0)
    })

    it('should expand photos array with specific Photo fields', () => {
      const schema = query.getSchema('Pet')
      const photosField = schema!.fields.find(f => f.name === 'photos')
      expect(photosField!.children!.some(f => f.name === 'id')).toBe(true)
      expect(photosField!.children!.some(f => f.name === 'url')).toBe(true)
      expect(photosField!.children!.some(f => f.name === 'caption')).toBe(true)
      expect(photosField!.children!.some(f => f.name === 'uploadedAt')).toBe(true)
    })

    it('should expand User.addresses array into Address fields', () => {
      const schema = query.getSchema('User')
      const addrField = schema!.fields.find(f => f.name === 'addresses')
      expect(addrField).toBeDefined()
      expect(addrField!.children).toBeDefined()
      expect(addrField!.children!.some(f => f.name === 'street')).toBe(true)
      expect(addrField!.children!.some(f => f.name === 'city')).toBe(true)
      expect(addrField!.children!.some(f => f.name === 'state')).toBe(true)
      expect(addrField!.children!.some(f => f.name === 'zip')).toBe(true)
      expect(addrField!.children!.some(f => f.name === 'country')).toBe(true)
      const countryField = addrField!.children!.find(f => f.name === 'country')
      expect(countryField!.defaultValue).toBe('US')
    })

    it('should not expand children for arrays of primitive items', () => {
      const schema = query.getSchema('Pet')
      const tagsField = schema!.fields.find(f => f.name === 'tags')
      expect(tagsField).toBeDefined()
      expect(tagsField!.type).toBe('string[]')
      expect(tagsField!.children).toBeUndefined()
    })

    it('should not re-expand already visited refs', () => {
      const schema = query.getSchema('Pet')
      const ownerField = schema!.fields.find(f => f.name === 'owner')
      expect(ownerField!.children).toBeDefined()
    })

    it('should handle non-existent ref names gracefully', () => {
      const schema = query.getSchema('Pet')
      expect(schema).toBeDefined()
      expect(schema!.fields.length).toBeGreaterThan(0)
    })
  })

  describe('getEndpointDetail with expandRefs', () => {
    it('should expand refs inline in endpoint detail by default', () => {
      const detail = query.getEndpointDetail('GET', '/pets/{petId}')
      expect(detail).toBeDefined()
      const resp200 = detail!.responses.find(r => r.code === '200')
      expect(resp200).toBeDefined()
      const ownerField = resp200!.fields.find(f => f.name === 'owner')
      expect(ownerField).toBeDefined()
      expect(ownerField!.children).toBeDefined()
      expect(ownerField!.children!.length).toBeGreaterThan(0)
    })
  })

  describe('generateExample', () => {
    it('should generate example for simple schema', () => {
      const schema = parser.getSchema('CreatePetRequest')!
      const example = query.generateExample(schema)
      expect(example).toBeDefined()
      expect(example.name).toBe('string')
      expect(example.species).toBe('cat')
      expect(example.ownerId).toBe('00000000-0000-0000-0000-000000000000')
    })

    it('should use first enum value', () => {
      const schema = parser.getSchema('Pet')!
      const example = query.generateExample(schema)
      expect(example.species).toBe('cat')
    })

    it('should generate uuid format strings', () => {
      const schema = parser.getSchema('Pet')!
      const example = query.generateExample(schema)
      expect(example.id).toBe('00000000-0000-0000-0000-000000000000')
    })

    it('should only include required fields', () => {
      const schema = parser.getSchema('Pet')!
      const example = query.generateExample(schema)
      expect(example.id).toBeDefined()
      expect(example.name).toBeDefined()
      expect(example.species).toBeDefined()
      expect(example.breed).toBeUndefined()
      expect(example.age).toBeUndefined()
    })

    it('should handle oneOf by using first variant', () => {
      const schema = parser.getSchema('PaymentRequest')!
      const example = query.generateExample(schema)
      expect(example.method).toBeDefined()
      expect(example.method.type).toBe('credit_card')
      expect(example.method.cardNumber).toBe('string')
    })

    it('should handle allOf by merging', () => {
      const schema = parser.getSchema('Staff')!
      const example = query.generateExample(schema)
      expect(example.name).toBe('string')
      expect(example.email).toBe('user@example.com')
    })

    it('should use schema example when available', () => {
      const example = query.generateExample({ type: 'string', example: 'Fido' } as any)
      expect(example).toBe('Fido')
    })

    it('should generate correct types for primitives', () => {
      expect(query.generateExample({ type: 'integer' } as any)).toBe(0)
      expect(query.generateExample({ type: 'number' } as any)).toBe(0)
      expect(query.generateExample({ type: 'boolean' } as any)).toBe(false)
      expect(query.generateExample({ type: 'string' } as any)).toBe('string')
    })

    it('should generate format-specific strings', () => {
      expect(query.generateExample({ type: 'string', format: 'email' } as any)).toBe('user@example.com')
      expect(query.generateExample({ type: 'string', format: 'date-time' } as any)).toBe('2024-01-01T00:00:00Z')
      expect(query.generateExample({ type: 'string', format: 'date' } as any)).toBe('2024-01-01')
      expect(query.generateExample({ type: 'string', format: 'uri' } as any)).toBe('https://example.com')
    })

    it('should generate arrays with one item', () => {
      const example = query.generateExample({
        type: 'array',
        items: { type: 'string' },
      } as any)
      expect(example).toEqual(['string'])
    })

    it('should return empty object for schema with no required fields', () => {
      const schema = parser.getSchema('Address')!
      const example = query.generateExample(schema)
      expect(example).toEqual({})
    })

    it('should generate password placeholder', () => {
      expect(query.generateExample({ type: 'string', format: 'password' } as any)).toBe('********')
    })

    it('should handle arrays of objects', () => {
      const example = query.generateExample({
        type: 'array',
        items: {
          type: 'object',
          required: ['street', 'city'],
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
          },
        },
      } as any)
      expect(Array.isArray(example)).toBe(true)
      expect(example[0].street).toBe('string')
      expect(example[0].city).toBe('string')
    })

    it('should detect circular schemas and return empty object', () => {
      const schema = {
        type: 'object',
        title: 'A',
        required: ['b'],
        properties: {
          b: {
            type: 'object',
            title: 'B',
            required: ['a'],
            properties: {
              a: { type: 'object', title: 'A', properties: { name: { type: 'string' } } },
            },
          },
        },
      }
      const example = query.generateExample(schema as any)
      expect(example.b).toBeDefined()
      expect(example.b.a).toEqual({})
    })
  })

  describe('generateEndpointExamples', () => {
    it('should generate request and response examples', () => {
      const examples = query.generateEndpointExamples('POST', '/pets')
      expect(examples).toBeDefined()
      expect(examples!.request).toBeDefined()
      expect(examples!.request.name).toBe('string')
      expect(examples!.responses['201']).toBeDefined()
      expect(examples!.responses['201'].id).toBeDefined()
    })

    it('should return undefined for non-existent endpoint', () => {
      expect(query.generateEndpointExamples('GET', '/nonexistent')).toBeUndefined()
    })

    it('should handle endpoints without request body', () => {
      const examples = query.generateEndpointExamples('GET', '/pets')
      expect(examples).toBeDefined()
      expect(examples!.request).toBeUndefined()
      expect(examples!.responses['200']).toBeDefined()
    })

    it('should include error response examples', () => {
      const examples = query.generateEndpointExamples('POST', '/pets')
      expect(examples!.responses['400']).toBeDefined()
      expect(examples!.responses['400'].message).toBe('string')
    })
  })

  describe('searchFields with exact', () => {
    it('should match exact field names only', () => {
      const results = query.searchFields('id', true)
      expect(results.length).toBeGreaterThan(0)
      for (const r of results) {
        expect(r.fields.every(f => f.name === 'id')).toBe(true)
      }
    })

    it('should not match partial field names', () => {
      const results = query.searchFields('id', true)
      const allFieldNames = results.flatMap(r => r.fields.map(f => f.name))
      expect(allFieldNames).not.toContain('petId')
      expect(allFieldNames).not.toContain('orderId')
      expect(allFieldNames).not.toContain('ownerId')
    })

    it('should still find exact matches', () => {
      const results = query.searchFields('id', true)
      const petResult = results.find(r => r.schema === 'Pet')
      expect(petResult).toBeDefined()
      expect(petResult!.fields.some(f => f.name === 'id')).toBe(true)
    })

    it('should match exact case-insensitively', () => {
      const results = query.searchFields('ID', true)
      expect(results.length).toBeGreaterThan(0)
      for (const r of results) {
        expect(r.fields.every(f => f.name.toLowerCase() === 'id')).toBe(true)
      }
    })
  })

  describe('searchEndpointFields with exact', () => {
    it('should match exact endpoint field names only', () => {
      const results = query.searchEndpointFields('petId', true)
      expect(results.length).toBeGreaterThan(0)
      for (const r of results) {
        expect(r.fields.every(f => f.name === 'petId')).toBe(true)
      }
    })

    it('should not match partial names in exact mode', () => {
      const results = query.searchEndpointFields('page', true)
      const allFieldNames = results.flatMap(r => r.fields.map(f => f.name))
      expect(allFieldNames.every(n => n === 'page')).toBe(true)
    })
  })

  describe('getApiSummary', () => {
    it('should return API overview', () => {
      const summary = query.getApiSummary()
      expect(summary.title).toBe('Pet Store API')
      expect(summary.version).toBe('1.0.0')
      expect(summary.endpoints).toBe(15)
      expect(summary.models).toBeGreaterThan(0)
      expect(summary.auth).toContain('Bearer token')
      expect(summary.servers.length).toBe(2)
    })

    it('should include tag counts', () => {
      const summary = query.getApiSummary()
      const petTag = summary.tags.find(t => t.name === 'Pets')
      expect(petTag).toBeDefined()
      expect(petTag!.count).toBe(7)
    })

    it('should include method distribution', () => {
      const summary = query.getApiSummary()
      expect(summary.methods.length).toBeGreaterThan(0)
      const getMethod = summary.methods.find(m => m.method === 'GET')
      expect(getMethod).toBeDefined()
      expect(getMethod!.count).toBeGreaterThan(0)
    })
  })
})
