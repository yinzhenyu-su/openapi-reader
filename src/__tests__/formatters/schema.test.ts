import { describe, it, expect } from 'vitest'
import { formatSchema, formatSchemaWithBackRefs, formatSchemaNotFound } from '../../formatters/schema.js'
import type { SchemaInfo, BackRef } from '../../types.js'

describe('schema formatters', () => {
  const mockSchema: SchemaInfo = {
    name: 'Pet',
    fields: [
      { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
      { name: 'name', type: 'string', required: true, description: 'Pet name' },
      { name: 'age', type: 'int', required: false, description: 'Age in years' },
    ],
  }

  describe('formatSchema', () => {
    it('should format schema with fields', () => {
      const output = formatSchema(mockSchema)
      expect(output).toContain('Pet')
      expect(output).toContain('id')
      expect(output).toContain('name')
      expect(output).toContain('age')
    })

    it('should handle schema with no fields', () => {
      const schema: SchemaInfo = { name: 'Empty', fields: [] }
      const output = formatSchema(schema)
      expect(output).toContain('Empty')
      expect(output).toContain('(no fields)')
    })
  })

  describe('formatSchemaWithBackRefs', () => {
    it('should format schema with back references', () => {
      const backRefs: BackRef[] = [
        { method: 'GET', path: '/pets', location: 'response 200' },
        { method: 'POST', path: '/pets', location: 'request body' },
      ]
      const output = formatSchemaWithBackRefs(mockSchema, backRefs)
      expect(output).toContain('Pet')
      expect(output).toContain('Used by:')
      expect(output).toContain('GET     /pets  (response 200)')
      expect(output).toContain('POST    /pets  (request body)')
    })

    it('should show not used message when no back refs', () => {
      const output = formatSchemaWithBackRefs(mockSchema, [])
      expect(output).toContain('Not used by any endpoint')
    })
  })

  describe('formatSchemaNotFound', () => {
    it('should return not found message', () => {
      const output = formatSchemaNotFound('NonExistent')
      expect(output).toContain('NonExistent')
      expect(output).toContain('not found')
    })
  })
})
