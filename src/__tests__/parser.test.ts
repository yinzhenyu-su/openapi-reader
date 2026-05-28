import { describe, it, expect } from 'vitest'
import { OpenApiParser } from '../parser.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const specPath = path.resolve(__dirname, '../../test-spec.yaml')

async function createParser() {
  const parser = new OpenApiParser()
  await parser.load(specPath)
  return parser
}

describe('OpenApiParser', () => {
  describe('load and metadata', () => {
    it('should load the spec successfully', async () => {
      const parser = await createParser()
      expect(parser.getTitle()).toBe('Pet Store API')
      expect(parser.getVersion()).toBe('1.0.0')
    })

    it('should return servers', async () => {
      const parser = await createParser()
      expect(parser.getServers()).toEqual([
        'https://api.petstore.example.com/v1',
        'https://staging.petstore.example.com/v1',
      ])
    })

    it('should return tags', async () => {
      const parser = await createParser()
      expect(parser.getTags()).toContain('Pets')
      expect(parser.getTags()).toContain('Store')
      expect(parser.getTags()).toContain('Users')
    })
  })

  describe('endpoints', () => {
    it('should return all operations', async () => {
      const parser = await createParser()
      const ops = parser.getAllOperations()
      expect(ops.length).toBe(15)
    })

    it('should get a specific operation', async () => {
      const parser = await createParser()
      const op = parser.getOperation('GET', '/pets')
      expect(op).toBeDefined()
      expect(op!.summary).toBe('List all pets')
      expect(op!.method).toBe('GET')
    })

    it('should return undefined for non-existent operation', async () => {
      const parser = await createParser()
      expect(parser.getOperation('GET', '/nonexistent')).toBeUndefined()
    })

    it('should count endpoints', async () => {
      const parser = await createParser()
      expect(parser.getEndpointCount()).toBe(15)
    })

    it('should return tag endpoint counts', async () => {
      const parser = await createParser()
      const counts = parser.getTagEndpointCounts()
      expect(counts['Pets']).toBe(7)
      expect(counts['Store']).toBe(3)
      expect(counts['Users']).toBe(3)
    })

    it('should detect deprecated endpoints', async () => {
      const parser = await createParser()
      const ops = parser.getAllOperations()
      const deprecated = ops.filter(op => op.deprecated)
      expect(deprecated.length).toBe(1)
      expect(deprecated[0].path).toBe('/pets/{petId}/archive')
      expect(deprecated[0].method).toBe('PUT')
    })

    it('should merge path-level parameters with operation parameters', async () => {
      const parser = await createParser()
      const op = parser.getOperation('GET', '/pets/{petId}')
      expect(op).toBeDefined()
      const pathParams = op!.parameters.filter(p => p.in === 'path')
      expect(pathParams.length).toBe(1)
      expect(pathParams[0].name).toBe('petId')
    })

    it('should handle endpoints with no tags as Other', async () => {
      const parser = await createParser()
      const op = parser.getOperation('GET', '/health')
      expect(op).toBeDefined()
      expect(op!.tags).toEqual([])
    })

    it('should include operation security override', async () => {
      const parser = await createParser()
      const op = parser.getOperation('GET', '/health')
      expect(op).toBeDefined()
      expect(op!.security).toEqual([])
    })
  })

  describe('search', () => {
    it('should search by path keyword', async () => {
      const parser = await createParser()
      const results = parser.searchOperations('pet')
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(r => r.path.toLowerCase().includes('pet'))).toBe(true)
    })

    it('should return empty for unmatched keyword', async () => {
      const parser = await createParser()
      const results = parser.searchOperations('zzzznotfound')
      expect(results.length).toBe(0)
    })

    it('should search by summary', async () => {
      const parser = await createParser()
      const results = parser.searchOperations('login')
      expect(results.length).toBe(1)
      expect(results[0].path).toBe('/users/login')
    })

    it('should search by tag', async () => {
      const parser = await createParser()
      const results = parser.searchOperations('Pets')
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(r => r.tags.includes('Pets'))).toBe(true)
    })
  })

  describe('schemas', () => {
    it('should list schema names', async () => {
      const parser = await createParser()
      const names = parser.getSchemaNames()
      expect(names).toContain('Pet')
      expect(names).toContain('User')
      expect(names).toContain('Order')
    })

    it('should get a specific schema', async () => {
      const parser = await createParser()
      const schema = parser.getSchema('Pet')
      expect(schema).toBeDefined()
      expect(schema!.type).toBe('object')
    })

    it('should return undefined for non-existent schema', async () => {
      const parser = await createParser()
      expect(parser.getSchema('NonExistent')).toBeUndefined()
    })

    it('should count schemas', async () => {
      const parser = await createParser()
      expect(parser.getSchemaCount()).toBeGreaterThan(0)
    })

    it('should return all schemas', async () => {
      const parser = await createParser()
      const schemas = parser.getAllSchemas()
      expect(schemas).toHaveProperty('Pet')
      expect(schemas).toHaveProperty('User')
    })

    it('should include allOf schema', async () => {
      const parser = await createParser()
      const schema = parser.getSchema('Staff')
      expect(schema).toBeDefined()
      expect(schema!.allOf).toBeDefined()
    })
  })

  describe('authentication', () => {
    it('should detect auth schemes', async () => {
      const parser = await createParser()
      const schemes = parser.getAuthSchemes()
      expect(schemes).toHaveProperty('bearerAuth')
      expect(schemes['bearerAuth']).toBe('Bearer token (Authorization header)')
    })

    it('should check if auth is required globally', async () => {
      const parser = await createParser()
      expect(parser.requiresAuth()).toBe(true)
    })

    it('should check if auth is required for specific operation', async () => {
      const parser = await createParser()
      const healthOp = parser.getOperation('GET', '/health')
      expect(parser.requiresAuth(healthOp!.security)).toBe(false)
    })

    it('should return auth summary', async () => {
      const parser = await createParser()
      const summary = parser.getAuthSummary()
      expect(summary).toContain('Bearer token')
    })

    it('should return Optional when no global security', async () => {
      const parser = new OpenApiParser()
      const noAuthSpecPath = path.resolve(__dirname, '../../test-spec-no-auth.yaml')
      await parser.load(noAuthSpecPath)
      const summary = parser.getAuthSummary()
      expect(summary).toContain('Optional')
    })
  })

  describe('operation details', () => {
    it('should include requestBody', async () => {
      const parser = await createParser()
      const op = parser.getOperation('POST', '/pets')
      expect(op).toBeDefined()
      expect(op!.requestBody).toBeDefined()
    })

    it('should include responses', async () => {
      const parser = await createParser()
      const op = parser.getOperation('GET', '/pets')
      expect(op).toBeDefined()
      expect(Object.keys(op!.responses).length).toBeGreaterThan(0)
    })

    it('should handle endpoints without requestBody', async () => {
      const parser = await createParser()
      const op = parser.getOperation('GET', '/pets')
      expect(op).toBeDefined()
      expect(op!.requestBody).toBeUndefined()
    })
  })
})
