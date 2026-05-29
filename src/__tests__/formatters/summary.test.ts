import { describe, it, expect } from 'vitest'
import { formatSummaryHuman as formatSummary } from '../../formatters/summary.js'
import type { ApiSummary } from '../../types.js'

describe('summary formatter', () => {
  const mockSummary: ApiSummary = {
    title: 'Pet Store API',
    version: '1.0.0',
    endpoints: 15,
    tags: [
      { name: 'Pets', count: 7 },
      { name: 'Store', count: 3 },
    ],
    methods: [
      { method: 'DELETE', count: 1 },
      { method: 'GET', count: 8 },
      { method: 'POST', count: 5 },
      { method: 'PUT', count: 1 },
    ],
    auth: 'Bearer token (Authorization header)',
    servers: ['https://api.petstore.example.com/v1'],
    models: 10,
  }

  const mockSchemas = ['Address', 'Error', 'Order', 'Pet', 'User']

  it('should format title and version', () => {
    const output = formatSummary(mockSummary, mockSchemas)
    expect(output).toContain('Pet Store API v1.0.0')
  })

  it('should include endpoint count', () => {
    const output = formatSummary(mockSummary, mockSchemas)
    expect(output).toContain('Endpoints:  15')
  })

  it('should include tag counts', () => {
    const output = formatSummary(mockSummary, mockSchemas)
    expect(output).toContain('Pets (7)')
    expect(output).toContain('Store (3)')
  })

  it('should include method distribution', () => {
    const output = formatSummary(mockSummary, mockSchemas)
    expect(output).toContain('Methods:')
    expect(output).toContain('GET (8)')
    expect(output).toContain('POST (5)')
  })

  it('should include auth info', () => {
    const output = formatSummary(mockSummary, mockSchemas)
    expect(output).toContain('Auth:')
    expect(output).toContain('Bearer token')
  })

  it('should include servers', () => {
    const output = formatSummary(mockSummary, mockSchemas)
    expect(output).toContain('Servers:')
    expect(output).toContain('https://api.petstore.example.com/v1')
  })

  it('should include model count', () => {
    const output = formatSummary(mockSummary, mockSchemas)
    expect(output).toContain('Models:     10')
  })

  it('should include schemas when provided', () => {
    const output = formatSummary(mockSummary, mockSchemas)
    expect(output).toContain('Schemas:')
    expect(output).toContain('Address')
    expect(output).toContain('Pet')
  })

  it('should truncate schemas when more than 15', () => {
    const manySchemas = Array.from({ length: 20 }, (_, i) => `Schema${i}`)
    const output = formatSummary(mockSummary, manySchemas)
    expect(output).toContain('... (5 more)')
    expect(output).toContain('Schema0')
    expect(output).not.toContain('Schema19')
  })

  it('should include command hints', () => {
    const output = formatSummary(mockSummary, mockSchemas)
    expect(output).toContain('Commands:')
    expect(output).toContain('ls')
    expect(output).toContain('get')
    expect(output).toContain('search')
    expect(output).toContain('schema')
  })

  it('should handle missing title', () => {
    const summary: ApiSummary = {
      ...mockSummary,
      title: '',
    }
    const output = formatSummary(summary, mockSchemas)
    expect(output).toContain('API v1.0.0')
  })

  it('should handle no servers', () => {
    const summary: ApiSummary = {
      ...mockSummary,
      servers: [],
    }
    const output = formatSummary(summary, mockSchemas)
    expect(output).not.toContain('Servers:')
  })

  it('should handle no tags', () => {
    const summary: ApiSummary = {
      ...mockSummary,
      tags: [],
    }
    const output = formatSummary(summary, mockSchemas)
    expect(output).not.toContain('Tags:')
  })

  it('should handle no schemas', () => {
    const output = formatSummary(mockSummary, [])
    expect(output).not.toContain('Schemas:')
  })
})
