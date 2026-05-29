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

  describe('getEndpointDetail with depth', () => {
    it('should expand nested fields with default depth', () => {
      const detail = query.getEndpointDetail('GET', '/pets/{petId}')
      const respFields = detail!.responses.find(r => r.code === '200')!.fields
      expect(respFields.length).toBeGreaterThan(0)
    })

    it('should limit nested expansion with depth=0', () => {
      const detail = query.getEndpointDetail('GET', '/pets/{petId}', 0)
      const respFields = detail!.responses.find(r => r.code === '200')!.fields
      expect(respFields.length).toBeGreaterThan(0)
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
  })
})
