import { describe, it, expect } from 'vitest'
import { formatSummary } from '../../formatters/summary.js'
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
    auth: 'Bearer token (Authorization header)',
    servers: ['https://api.petstore.example.com/v1'],
    models: 10,
  }

  it('should format title and version', () => {
    const output = formatSummary(mockSummary)
    expect(output).toContain('Pet Store API v1.0.0')
  })

  it('should include endpoint count', () => {
    const output = formatSummary(mockSummary)
    expect(output).toContain('Endpoints:  15')
  })

  it('should include tag counts', () => {
    const output = formatSummary(mockSummary)
    expect(output).toContain('Pets (7)')
    expect(output).toContain('Store (3)')
  })

  it('should include auth info', () => {
    const output = formatSummary(mockSummary)
    expect(output).toContain('Auth:')
    expect(output).toContain('Bearer token')
  })

  it('should include servers', () => {
    const output = formatSummary(mockSummary)
    expect(output).toContain('Servers:')
    expect(output).toContain('https://api.petstore.example.com/v1')
  })

  it('should include model count', () => {
    const output = formatSummary(mockSummary)
    expect(output).toContain('Models:     10')
  })

  it('should handle missing title', () => {
    const summary: ApiSummary = {
      ...mockSummary,
      title: '',
    }
    const output = formatSummary(summary)
    expect(output).toContain('API v1.0.0')
  })

  it('should handle no servers', () => {
    const summary: ApiSummary = {
      ...mockSummary,
      servers: [],
    }
    const output = formatSummary(summary)
    expect(output).not.toContain('Servers:')
  })

  it('should handle no tags', () => {
    const summary: ApiSummary = {
      ...mockSummary,
      tags: [],
    }
    const output = formatSummary(summary)
    expect(output).not.toContain('Tags:')
  })
})
