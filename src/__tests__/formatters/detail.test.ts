import { describe, it, expect } from 'vitest'
import { formatDetail, formatParamsOnly, formatResponseOnly, formatCodesOnly } from '../../formatters/detail.js'
import type { EndpointDetail } from '../../types.js'

function createMockDetail(overrides: Partial<EndpointDetail> = {}): EndpointDetail {
  return {
    method: 'POST',
    path: '/pets',
    summary: 'Create a pet',
    auth: 'Bearer token (Authorization header)',
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

describe('detail formatters', () => {
  describe('formatDetail', () => {
    it('should format basic endpoint detail', () => {
      const output = formatDetail(createMockDetail())
      expect(output).toContain('POST /pets')
      expect(output).toContain('Create a pet')
    })

    it('should include auth information', () => {
      const output = formatDetail(createMockDetail())
      expect(output).toContain('Auth:')
      expect(output).toContain('Bearer token')
    })

    it('should include request body', () => {
      const output = formatDetail(createMockDetail())
      expect(output).toContain('Request Body (application/json)')
      expect(output).toContain('name')
    })

    it('should include responses', () => {
      const output = formatDetail(createMockDetail())
      expect(output).toContain('Responses:')
      expect(output).toContain('201')
      expect(output).toContain('Pet created')
    })

    it('should include error codes', () => {
      const output = formatDetail(createMockDetail())
      expect(output).toContain('Errors:')
      expect(output).toContain('400')
      expect(output).toContain('409')
    })

    it('should mark deprecated endpoints', () => {
      const output = formatDetail(createMockDetail({ deprecated: true }))
      expect(output).toContain('⚠ DEPRECATED')
    })

    it('should include deprecation message', () => {
      const output = formatDetail(createMockDetail({ deprecated: true, deprecationMessage: 'Use v2 endpoint' }))
      expect(output).toContain('⚠ DEPRECATED')
      expect(output).toContain('Use v2 endpoint')
    })

    it('should include path parameters', () => {
      const detail = createMockDetail({
        params: {
          pathParams: [{ name: 'petId', type: 'string', required: true, description: 'Pet UUID' }],
          queryParams: [],
          headerParams: [],
          body: undefined,
        },
      })
      const output = formatDetail(detail)
      expect(output).toContain('Path Parameters:')
      expect(output).toContain('petId')
    })

    it('should include query parameters', () => {
      const detail = createMockDetail({
        params: {
          pathParams: [],
          queryParams: [{ name: 'limit', type: 'int', required: false, description: '' }],
          headerParams: [],
          body: undefined,
        },
      })
      const output = formatDetail(detail)
      expect(output).toContain('Query Parameters:')
      expect(output).toContain('limit')
    })

    it('should include header parameters', () => {
      const detail = createMockDetail({
        params: {
          pathParams: [],
          queryParams: [],
          headerParams: [{ name: 'X-Request-Id', type: 'string', required: false, description: '' }],
          body: undefined,
        },
      })
      const output = formatDetail(detail)
      expect(output).toContain('Header Parameters:')
      expect(output).toContain('X-Request-Id')
    })

    it('should not show empty sections', () => {
      const detail = createMockDetail({
        params: {
          pathParams: [],
          queryParams: [],
          headerParams: [],
          body: undefined,
        },
        responses: [],
        codes: [],
      })
      const output = formatDetail(detail)
      expect(output).not.toContain('Path Parameters:')
      expect(output).not.toContain('Query Parameters:')
      expect(output).not.toContain('Header Parameters:')
      expect(output).not.toContain('Request Body')
      expect(output).not.toContain('Responses:')
      expect(output).not.toContain('Errors:')
    })
  })

  describe('formatParamsOnly', () => {
    it('should format only parameters', () => {
      const detail = createMockDetail()
      const output = formatParamsOnly(detail)
      expect(output).toContain('POST /pets')
      expect(output).toContain('Request Body')
      expect(output).not.toContain('Responses:')
      expect(output).not.toContain('Errors:')
    })

    it('should mark deprecated', () => {
      const detail = createMockDetail({ deprecated: true })
      const output = formatParamsOnly(detail)
      expect(output).toContain('⚠ DEPRECATED')
    })
  })

  describe('formatResponseOnly', () => {
    it('should format only responses', () => {
      const output = formatResponseOnly('GET', '/pets', [
        { code: '200', description: 'OK', fields: [{ name: 'id', type: 'string', required: true, description: '' }] },
      ])
      expect(output).toContain('GET /pets')
      expect(output).toContain('200')
      expect(output).not.toContain('Request Body')
      expect(output).not.toContain('Auth:')
    })
  })

  describe('formatCodesOnly', () => {
    it('should format only codes', () => {
      const output = formatCodesOnly('GET', '/pets', [
        { code: '200', description: 'OK' },
        { code: '404', description: 'Not found' },
      ])
      expect(output).toContain('GET /pets')
      expect(output).toContain('Possible codes')
      expect(output).toContain('200')
      expect(output).toContain('404')
    })
  })
})
