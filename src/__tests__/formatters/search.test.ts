import { describe, it, expect } from 'vitest'
import { formatSearch } from '../../formatters/search.js'
import type { EndpointSummary } from '../../types.js'

describe('search formatter', () => {
  const mockResults: EndpointSummary[] = [
    { method: 'GET', path: '/pets', summary: 'List all pets', tags: ['Pets'] },
    { method: 'POST', path: '/pets', summary: 'Create a pet', tags: ['Pets'] },
  ]

  it('should format search results with keyword', () => {
    const output = formatSearch(mockResults, 'pet')
    expect(output).toContain('Search results for "pet"')
    expect(output).toContain('GET     /pets')
    expect(output).toContain('POST    /pets')
  })

  it('should include summary in results', () => {
    const output = formatSearch(mockResults, 'pet')
    expect(output).toContain('List all pets')
    expect(output).toContain('Create a pet')
  })

  it('should return no results message for empty results', () => {
    const output = formatSearch([], 'nonexistent')
    expect(output).toContain('No endpoints matching "nonexistent"')
  })
})
