import { describe, it, expect } from 'vitest'
import {
  formatListingJSON,
  formatDetailJSON,
  formatSearchJSON,
  formatSchemaJSON,
  formatSummaryJSON,
} from '../../formatters/json.js'
import type { EndpointSummary, EndpointDetail, SchemaInfo, ApiSummary, BackRef } from '../../types.js'

describe('JSON formatters', () => {
  describe('formatListingJSON', () => {
    it('should return valid JSON array', () => {
      const endpoints: EndpointSummary[] = [
        { method: 'GET', path: '/pets', summary: 'List pets', tags: ['Pets'] },
      ]
      const output = formatListingJSON(endpoints)
      const parsed = JSON.parse(output)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed[0].method).toBe('GET')
      expect(parsed[0].path).toBe('/pets')
    })

    it('should include deprecated flag', () => {
      const endpoints: EndpointSummary[] = [
        { method: 'GET', path: '/pets', summary: '', tags: ['Pets'], deprecated: true },
      ]
      const parsed = JSON.parse(formatListingJSON(endpoints))
      expect(parsed[0].deprecated).toBe(true)
    })

    it('should convert null summary', () => {
      const endpoints: EndpointSummary[] = [
        { method: 'GET', path: '/pets', summary: '', tags: ['Pets'] },
      ]
      const parsed = JSON.parse(formatListingJSON(endpoints))
      expect(parsed[0].summary).toBeNull()
    })
  })

  describe('formatDetailJSON', () => {
    const mockDetail: EndpointDetail = {
      method: 'POST',
      path: '/pets',
      summary: 'Create a pet',
      auth: 'Bearer token',
      deprecated: false,
      params: {
        pathParams: [],
        queryParams: [],
        headerParams: [],
        body: {
          contentType: 'application/json',
          required: true,
          fields: [
            { name: 'name', type: 'string', required: true, description: 'Pet name' },
          ],
        },
      },
      responses: [
        { code: '201', description: 'Created', fields: [{ name: 'id', type: 'string', required: true, description: '' }] },
      ],
      codes: [{ code: '201', description: 'Created' }],
    }

    it('should return valid JSON object', () => {
      const output = formatDetailJSON(mockDetail)
      const parsed = JSON.parse(output)
      expect(parsed.endpoint.method).toBe('POST')
      expect(parsed.endpoint.path).toBe('/pets')
    })

    it('should include auth', () => {
      const parsed = JSON.parse(formatDetailJSON(mockDetail))
      expect(parsed.auth).toBe('Bearer token')
    })

    it('should include parameters', () => {
      const parsed = JSON.parse(formatDetailJSON(mockDetail))
      expect(parsed.parameters.body).toBeDefined()
      expect(parsed.parameters.body.fields[0].name).toBe('name')
    })

    it('should include responses', () => {
      const parsed = JSON.parse(formatDetailJSON(mockDetail))
      expect(parsed.responses['201']).toBeDefined()
    })

    it('should include deprecated flag when true', () => {
      const detail = { ...mockDetail, deprecated: true as const }
      const parsed = JSON.parse(formatDetailJSON(detail))
      expect(parsed.deprecated).toBe(true)
    })

    it('should include deprecation message', () => {
      const detail = { ...mockDetail, deprecated: true as const, deprecationMessage: 'Use v2' }
      const parsed = JSON.parse(formatDetailJSON(detail))
      expect(parsed.deprecationMessage).toBe('Use v2')
    })
  })

  describe('formatSearchJSON', () => {
    it('should return same format as listing', () => {
      const results: EndpointSummary[] = [
        { method: 'GET', path: '/pets', summary: 'List pets', tags: ['Pets'] },
      ]
      const searchOutput = formatSearchJSON(results)
      const listingOutput = formatListingJSON(results)
      expect(searchOutput).toBe(listingOutput)
    })
  })

  describe('formatSchemaJSON', () => {
    const mockSchema: SchemaInfo = {
      name: 'Pet',
      fields: [
        { name: 'id', type: 'string', required: true, description: '' },
      ],
    }

    it('should return valid JSON', () => {
      const output = formatSchemaJSON(mockSchema)
      const parsed = JSON.parse(output)
      expect(parsed.name).toBe('Pet')
      expect(Array.isArray(parsed.fields)).toBe(true)
    })

    it('should include back refs when provided', () => {
      const backRefs: BackRef[] = [
        { method: 'GET', path: '/pets', location: 'response 200' },
      ]
      const parsed = JSON.parse(formatSchemaJSON(mockSchema, backRefs))
      expect(parsed.usedBy).toBeDefined()
      expect(parsed.usedBy[0].method).toBe('GET')
    })

    it('should not include usedBy when backRefs not provided', () => {
      const parsed = JSON.parse(formatSchemaJSON(mockSchema))
      expect(parsed.usedBy).toBeUndefined()
    })

    it('should handle field with enum values', () => {
      const schema: SchemaInfo = {
        name: 'Pet',
        fields: [
          { name: 'species', type: 'string', required: true, description: '', enumValues: ['cat', 'dog'] },
        ],
      }
      const parsed = JSON.parse(formatSchemaJSON(schema))
      expect(parsed.fields[0].enum).toEqual(['cat', 'dog'])
    })

    it('should handle field with children', () => {
      const schema: SchemaInfo = {
        name: 'Pet',
        fields: [
          {
            name: 'owner',
            type: 'object',
            required: false,
            description: '',
            children: [
              { name: 'id', type: 'string', required: true, description: '' },
            ],
          },
        ],
      }
      const parsed = JSON.parse(formatSchemaJSON(schema))
      expect(parsed.fields[0].children).toBeDefined()
      expect(parsed.fields[0].children[0].name).toBe('id')
    })

    it('should handle field with oneOf', () => {
      const schema: SchemaInfo = {
        name: 'Payment',
        fields: [
          {
            name: 'method',
            type: 'oneOf',
            required: true,
            description: '',
            oneOf: [
              [{ name: 'type', type: 'string', required: true, description: '', enumValues: ['credit_card'] }],
            ],
          },
        ],
      }
      const parsed = JSON.parse(formatSchemaJSON(schema))
      expect(parsed.fields[0].oneOf).toBeDefined()
    })
  })

  describe('formatSummaryJSON', () => {
    const mockSummary: ApiSummary = {
      title: 'Pet Store API',
      version: '1.0.0',
      endpoints: 15,
      tags: [{ name: 'Pets', count: 7 }],
      auth: 'Bearer token',
      servers: ['https://api.example.com'],
      models: 10,
    }

    it('should return valid JSON', () => {
      const output = formatSummaryJSON(mockSummary)
      const parsed = JSON.parse(output)
      expect(parsed.title).toBe('Pet Store API')
      expect(parsed.version).toBe('1.0.0')
      expect(parsed.endpoints).toBe(15)
      expect(parsed.models).toBe(10)
    })

    it('should include tags with counts', () => {
      const parsed = JSON.parse(formatSummaryJSON(mockSummary))
      expect(parsed.tags[0].name).toBe('Pets')
      expect(parsed.tags[0].count).toBe(7)
    })

    it('should include servers', () => {
      const parsed = JSON.parse(formatSummaryJSON(mockSummary))
      expect(parsed.servers).toContain('https://api.example.com')
    })
  })
})
