import { describe, it, expect } from 'vitest'
import { formatSchemaFieldSearch, formatEndpointFieldSearch } from '../../formatters/search-fields.js'
import type { FieldInfo } from '../../types.js'

describe('search-fields formatters', () => {
  const mockFields: FieldInfo[] = [
    { name: 'email', type: 'string', required: true, description: 'Email address' },
    { name: 'age', type: 'int', required: false, description: 'Age in years' },
  ]

  describe('formatSchemaFieldSearch', () => {
    it('should format with ## header', () => {
      const output = formatSchemaFieldSearch(
        [{ schema: 'User', fields: mockFields }],
        'email',
      )
      expect(output).toContain('## Schema field search: "email"')
      expect(output).toContain('**User**')
      expect(output).toContain('- email: string, req')
    })

    it('should return no matches message', () => {
      const output = formatSchemaFieldSearch([], 'xyz')
      expect(output).toBe('No schemas contain fields matching "xyz"')
    })
  })

  describe('formatEndpointFieldSearch', () => {
    it('should format with ## header', () => {
      const output = formatEndpointFieldSearch(
        [{ method: 'POST', path: '/users', fields: mockFields }],
        'email',
      )
      expect(output).toContain('## Endpoint field search: "email"')
      expect(output).toContain('**POST /users**')
      expect(output).toContain('- email: string, req')
    })

    it('should return no matches message', () => {
      const output = formatEndpointFieldSearch([], 'xyz')
      expect(output).toBe('No endpoints contain fields matching "xyz"')
    })
  })
})
