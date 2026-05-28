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

    it('should count schemas', async () => {
      const parser = await createParser()
      expect(parser.getSchemaCount()).toBeGreaterThan(0)
    })
  })

  describe('authentication', () => {
    it('should detect auth schemes', async () => {
      const parser = await createParser()
      const schemes = parser.getAuthSchemes()
      expect(schemes).toHaveProperty('bearerAuth')
    })

    it('should check if auth is required', async () => {
      const parser = await createParser()
      expect(parser.requiresAuth()).toBe(true)
    })
  })
})
