import { describe, it, expect } from 'vitest'
import { formatListing } from '../../formatters/listing.js'
import type { EndpointSummary } from '../../types.js'

describe('listing formatter', () => {
  it('should format endpoints grouped by tag', () => {
    const endpoints: EndpointSummary[] = [
      { method: 'GET', path: '/pets', summary: 'List pets', tags: ['Pets'] },
      { method: 'POST', path: '/pets', summary: 'Create pet', tags: ['Pets'] },
      { method: 'GET', path: '/users', summary: 'List users', tags: ['Users'] },
    ]
    const output = formatListing(endpoints)
    expect(output).toContain('Pets:')
    expect(output).toContain('Users:')
    expect(output).toContain('GET     /pets')
    expect(output).toContain('POST    /pets')
    expect(output).toContain('GET     /users')
  })

  it('should sort tags alphabetically', () => {
    const endpoints: EndpointSummary[] = [
      { method: 'GET', path: '/users', summary: '', tags: ['Users'] },
      { method: 'GET', path: '/pets', summary: '', tags: ['Pets'] },
    ]
    const output = formatListing(endpoints)
    const petsIdx = output.indexOf('Pets:')
    const usersIdx = output.indexOf('Users:')
    expect(petsIdx).toBeLessThan(usersIdx)
  })

  it('should mark deprecated endpoints', () => {
    const endpoints: EndpointSummary[] = [
      { method: 'GET', path: '/pets', summary: 'List pets', tags: ['Pets'], deprecated: true },
    ]
    const output = formatListing(endpoints)
    expect(output).toContain('⚠')
  })

  it('should handle endpoints without tags as Other', () => {
    const endpoints: EndpointSummary[] = [
      { method: 'GET', path: '/health', summary: 'Health check', tags: ['Other'] },
    ]
    const output = formatListing(endpoints)
    expect(output).toContain('Other:')
  })

  it('should handle empty endpoint list', () => {
    const output = formatListing([])
    expect(output).toBe('')
  })

  it('should include summary in output', () => {
    const endpoints: EndpointSummary[] = [
      { method: 'GET', path: '/pets', summary: 'List all pets', tags: ['Pets'] },
    ]
    const output = formatListing(endpoints)
    expect(output).toContain('List all pets')
  })

  it('should handle endpoints with multiple tags', () => {
    const endpoints: EndpointSummary[] = [
      { method: 'GET', path: '/pets/{petId}', summary: 'Get pet', tags: ['Pets', 'Store'] },
    ]
    const output = formatListing(endpoints)
    expect(output).toContain('Pets:')
    expect(output).toContain('Store:')
  })
})
