import { describe, it, expect } from 'vitest'
import { formatListingLLM, formatDetailLLM, formatParamsOnlyLLM, formatResponseOnlyLLM, formatCodesOnlyLLM, formatSearchLLM, formatSchemaLLM, formatSchemaWithBackRefsLLM, formatSummaryLLM, formatExampleLLM } from '../../formatters/llm.js'
import type { EndpointSummary, EndpointDetail, SchemaInfo, BackRef, ApiSummary } from '../../types.js'

describe('LLM formatters', () => {
  describe('formatListingLLM', () => {
    it('should format endpoints grouped by tag with ## headers', () => {
      const endpoints: EndpointSummary[] = [
        { method: 'GET', path: '/pets', summary: 'List pets', tags: ['Pets'] },
        { method: 'POST', path: '/pets', summary: 'Create pet', tags: ['Pets'] },
        { method: 'GET', path: '/users', summary: 'List users', tags: ['Users'] },
      ]
      const output = formatListingLLM(endpoints)
      expect(output).toContain('## Pets')
      expect(output).toContain('## Users')
      expect(output).toContain('GET /pets')
      expect(output).toMatch(/^## Pets\n/m)
    })

    it('should mark deprecated endpoints', () => {
      const endpoints: EndpointSummary[] = [
        { method: 'GET', path: '/pets', summary: 'List pets', tags: ['Pets'], deprecated: true },
      ]
      const output = formatListingLLM(endpoints)
      expect(output).toContain('[DEPRECATED]')
    })
  })

  describe('formatDetailLLM', () => {
    function mockDetail(overrides: Partial<EndpointDetail> = {}): EndpointDetail {
      return {
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
              { name: 'age', type: 'int', required: false, description: 'Age in years' },
            ],
          },
        },
        responses: [
          { code: '201', description: 'Pet created', fields: [{ name: 'id', type: 'string', required: true, description: '' }] },
          { code: '400', description: 'Validation error', fields: [] },
        ],
        codes: [
          { code: '201', description: 'Pet created' },
          { code: '400', description: 'Validation error' },
          { code: '409', description: 'Pet already exists' },
        ],
        ...overrides,
      }
    }

    it('should format with ## header', () => {
      const output = formatDetailLLM(mockDetail())
      expect(output).toMatch(/^## POST \/pets/m)
      expect(output).toContain('Create a pet')
    })

    it('should include ### sections for parameters', () => {
      const detail = mockDetail({
        params: {
          pathParams: [{ name: 'petId', type: 'string', required: true, description: 'Pet UUID' }],
          queryParams: [{ name: 'limit', type: 'int', required: false, description: '' }],
          headerParams: [{ name: 'X-Id', type: 'string', required: false, description: '' }],
          body: undefined,
        },
      })
      const output = formatDetailLLM(detail)
      expect(output).toContain('### Path Parameters')
      expect(output).toContain('### Query Parameters')
      expect(output).toContain('### Header Parameters')
      expect(output).toContain('- petId: string, req')
    })

    it('should include request body with req/opt markers', () => {
      const output = formatDetailLLM(mockDetail())
      expect(output).toContain('### Request Body (application/json, req)')
      expect(output).toContain('- name: string, req')
      expect(output).toContain('- age: int, opt')
    })

    it('should include responses', () => {
      const output = formatDetailLLM(mockDetail())
      expect(output).toContain('### 201')
      expect(output).toContain('Pet created')
      expect(output).toContain('- id: string, req')
    })

    it('should include errors section with - prefix', () => {
      const output = formatDetailLLM(mockDetail())
      expect(output).toContain('### Errors')
      expect(output).toContain('- 400')
      expect(output).toContain('- 409')
    })

    it('should show deprecated marker', () => {
      const output = formatDetailLLM(mockDetail({ deprecated: true, deprecationMessage: 'Use v2' }))
      expect(output).toContain('[DEPRECATED]')
      expect(output).toContain('Use v2')
    })

    it('should not show empty sections', () => {
      const detail = mockDetail({
        params: { pathParams: [], queryParams: [], headerParams: [], body: undefined },
        responses: [],
        codes: [],
      })
      const output = formatDetailLLM(detail)
      expect(output).not.toContain('### Path')
      expect(output).not.toContain('### Query')
      expect(output).not.toContain('### Header')
      expect(output).not.toContain('Request Body')
      expect(output).not.toContain('### Errors')
    })
  })

  describe('formatParamsOnlyLLM', () => {
    it('should format only parameters', () => {
      const detail: EndpointDetail = {
        method: 'POST', path: '/pets', summary: '', auth: '', deprecated: false,
        params: {
          pathParams: [],
          queryParams: [{ name: 'limit', type: 'int', required: false, description: '' }],
          headerParams: [],
          body: undefined,
        },
        responses: [],
        codes: [],
      }
      const output = formatParamsOnlyLLM(detail)
      expect(output).toMatch(/^## POST \/pets/m)
      expect(output).toContain('### Query Parameters')
      expect(output).not.toContain('### 20')
    })
  })

  describe('formatResponseOnlyLLM', () => {
    it('should format only responses', () => {
      const output = formatResponseOnlyLLM('GET', '/pets', [
        { code: '200', description: 'OK', fields: [{ name: 'id', type: 'string', required: true, description: '' }] },
      ])
      expect(output).toMatch(/^## GET \/pets/m)
      expect(output).toContain('### 200')
      expect(output).toContain('- id: string, req')
    })
  })

  describe('formatCodesOnlyLLM', () => {
    it('should format codes with - prefix', () => {
      const output = formatCodesOnlyLLM('GET', '/pets', [
        { code: '200', description: 'OK' },
        { code: '404', description: 'Not found' },
      ])
      expect(output).toMatch(/^## GET \/pets/m)
      expect(output).toContain('- 200')
      expect(output).toContain('- 404')
    })
  })

  describe('formatSearchLLM', () => {
    it('should format with ## header', () => {
      const results: EndpointSummary[] = [
        { method: 'GET', path: '/pets', summary: 'List pets', tags: ['Pets'] },
      ]
      const output = formatSearchLLM(results, 'pet')
      expect(output).toContain('## Search: "pet"')
      expect(output).toContain('GET /pets')
    })

    it('should return no results message', () => {
      const output = formatSearchLLM([], 'xyz')
      expect(output).toBe('No endpoints matching "xyz"')
    })
  })

  describe('formatSchemaLLM', () => {
    it('should format with ## header and - fields', () => {
      const schema: SchemaInfo = {
        name: 'Pet',
        fields: [
          { name: 'id', type: 'string', required: true, description: 'ID' },
          { name: 'name', type: 'string', required: true, description: 'Name' },
        ],
      }
      const output = formatSchemaLLM(schema)
      expect(output).toMatch(/^## Pet/m)
      expect(output).toContain('- id: string, req')
      expect(output).toContain('- name: string, req')
    })
  })

  describe('formatSchemaWithBackRefsLLM', () => {
    it('should show used by section', () => {
      const schema: SchemaInfo = { name: 'Pet', fields: [] }
      const backRefs: BackRef[] = [
        { method: 'GET', path: '/pets', location: 'response 200' },
      ]
      const output = formatSchemaWithBackRefsLLM(schema, backRefs)
      expect(output).toContain('Used by:')
      expect(output).toContain('GET /pets')
    })
  })

  describe('formatSummaryLLM', () => {
    const summary: ApiSummary = {
      title: 'Pet Store API',
      version: '1.0.0',
      endpoints: 15,
      tags: [{ name: 'Pets', count: 7 }],
      methods: [{ method: 'GET', count: 8 }, { method: 'POST', count: 7 }],
      auth: 'Bearer token',
      servers: ['https://api.example.com/v1'],
      models: 10,
    }

    const schemaNames = ['Address', 'Error', 'Pet', 'User']

    it('should format with ## header', () => {
      const output = formatSummaryLLM(summary, schemaNames)
      expect(output).toMatch(/^## Pet Store API v1\.0\.0/m)
    })

    it('should include key info with - prefix', () => {
      const output = formatSummaryLLM(summary, schemaNames)
      expect(output).toContain('- Endpoints: 15')
      expect(output).toContain('- Auth: Bearer token')
      expect(output).toContain('- Models: 10')
    })

    it('should include method distribution', () => {
      const output = formatSummaryLLM(summary, schemaNames)
      expect(output).toContain('- Methods:')
      expect(output).toContain('GET (8)')
      expect(output).toContain('POST (7)')
    })

    it('should include schemas', () => {
      const output = formatSummaryLLM(summary, schemaNames)
      expect(output).toContain('- Schemas: Address, Error, Pet, User')
    })

    it('should include command hints', () => {
      const output = formatSummaryLLM(summary, schemaNames)
      expect(output).toContain('Commands:')
      expect(output).toContain('ls')
      expect(output).toContain('get')
      expect(output).toContain('search')
      expect(output).toContain('schema')
    })
  })

  describe('formatExampleLLM', () => {
    it('should format request and response examples with ### headers', () => {
      const output = formatExampleLLM({
        request: { name: 'Fido', species: 'dog' },
        responses: { '201': { id: '123', name: 'Fido' } },
      })
      expect(output).toContain('### Request Example')
      expect(output).toContain('### Response 201 Example')
      expect(output).toContain('```json')
      expect(output).toContain('"name": "Fido"')
    })

    it('should handle request-only examples', () => {
      const output = formatExampleLLM({
        request: { name: 'test' },
        responses: {},
      })
      expect(output).toContain('### Request Example')
      expect(output).not.toContain('Response')
    })

    it('should handle response-only examples', () => {
      const output = formatExampleLLM({
        responses: { '200': { id: '123' } },
      })
      expect(output).not.toContain('Request')
      expect(output).toContain('### Response 200 Example')
    })

    it('should include valid JSON in code blocks', () => {
      const output = formatExampleLLM({
        request: { name: 'test' },
        responses: {},
      })
      const match = output.match(/```json\n([\s\S]*?)\n```/)
      expect(match).toBeDefined()
      const parsed = JSON.parse(match![1])
      expect(parsed.name).toBe('test')
    })
  })
})
