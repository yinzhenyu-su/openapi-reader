import { describe, it, expect } from 'vitest'
import { truncateDesc, fmtType, fmtRequired, fmtFields, fmtRequiredMark, fmtSectionHeader, fmtSeparator } from '../../formatters/shared.js'
import type { FieldInfo } from '../../types.js'

describe('shared formatters', () => {
  describe('truncateDesc', () => {
    it('should return short descriptions unchanged', () => {
      expect(truncateDesc('Short desc')).toBe('Short desc')
    })

    it('should return empty string for empty input', () => {
      expect(truncateDesc('')).toBe('')
    })

    it('should truncate at first sentence if within 80 chars', () => {
      const long = 'This is the first sentence. ' + 'A'.repeat(100)
      const result = truncateDesc(long)
      expect(result).toBe('This is the first sentence.')
    })

    it('should truncate with ellipsis if no sentence break within 80 chars', () => {
      const long = 'A'.repeat(100)
      const result = truncateDesc(long)
      expect(result).toBe('A'.repeat(77) + '...')
    })

    it('should return unchanged if exactly 80 chars', () => {
      const exact = 'A'.repeat(80)
      expect(truncateDesc(exact)).toBe(exact)
    })
  })

  describe('fmtType', () => {
    it('should return type for non-enum fields', () => {
      const field: FieldInfo = { name: 'id', type: 'string', required: true, description: '' }
      expect(fmtType(field)).toBe('string')
    })

    it('should join enum values with pipe', () => {
      const field: FieldInfo = { name: 'status', type: 'string', required: true, description: '', enumValues: ['active', 'inactive'] }
      expect(fmtType(field)).toBe('active | inactive')
    })

    it('should truncate enum display for more than 5 values', () => {
      const field: FieldInfo = { name: 'status', type: 'string', required: true, description: '', enumValues: ['a', 'b', 'c', 'd', 'e', 'f'] }
      expect(fmtType(field)).toBe('a | ...')
    })
  })

  describe('fmtRequired', () => {
    it('should show ✱ for required fields', () => {
      const field: FieldInfo = { name: 'id', type: 'string', required: true, description: '' }
      expect(fmtRequired(field)).toBe(' ✱')
    })

    it('should show spaces for optional fields', () => {
      const field: FieldInfo = { name: 'id', type: 'string', required: false, description: '' }
      expect(fmtRequired(field)).toBe('  ')
    })
  })

  describe('fmtRequiredMark', () => {
    it('should return ✱ for required', () => {
      expect(fmtRequiredMark(true)).toBe('✱')
    })

    it('should return space for optional', () => {
      expect(fmtRequiredMark(false)).toBe(' ')
    })
  })

  describe('fmtSectionHeader', () => {
    it('should format header without required', () => {
      expect(fmtSectionHeader('Path Parameters')).toBe('Path Parameters:')
    })

    it('should format header with required', () => {
      expect(fmtSectionHeader('Request Body', true)).toBe('Request Body ✱:')
    })
  })

  describe('fmtSeparator', () => {
    it('should return default length separator', () => {
      const sep = fmtSeparator()
      expect(sep.length).toBe(48)
      expect(sep).toBe('─'.repeat(48))
    })

    it('should return custom length separator', () => {
      const sep = fmtSeparator(10)
      expect(sep.length).toBe(10)
    })
  })

  describe('fmtFields', () => {
    it('should format multiple fields', () => {
      const fields: FieldInfo[] = [
        { name: 'id', type: 'string', required: true, description: '' },
        { name: 'name', type: 'string', required: true, description: '' },
      ]
      const result = fmtFields(fields)
      expect(result).toContain('id')
      expect(result).toContain('name')
    })

    it('should format field with required marker', () => {
      const fields: FieldInfo[] = [
        { name: 'id', type: 'string', required: true, description: '' },
      ]
      const result = fmtFields(fields)
      expect(result).toContain('✱')
    })

    it('should format field with enum values', () => {
      const fields: FieldInfo[] = [
        { name: 'status', type: 'string', required: false, description: '', enumValues: ['active', 'inactive'] },
      ]
      const result = fmtFields(fields)
      expect(result).toContain('active | inactive')
    })

    it('should truncate long descriptions', () => {
      const fields: FieldInfo[] = [
        { name: 'desc', type: 'string', required: false, description: 'A'.repeat(100) },
      ]
      const result = fmtFields(fields)
      expect(result).toContain('...')
    })

    it('should handle oneOf fields', () => {
      const fields: FieldInfo[] = [
        {
          name: 'payment',
          type: 'oneOf',
          required: true,
          description: '',
          oneOf: [
            [{ name: 'type', type: 'string', required: true, description: '', enumValues: ['credit_card'] }],
          ],
        },
      ]
      const result = fmtFields(fields)
      expect(result).toContain('payment')
      expect(result).toContain('oneOf (choose one)')
    })

    it('should handle fields with children', () => {
      const fields: FieldInfo[] = [
        {
          name: 'owner',
          type: 'object',
          required: false,
          description: '',
          children: [
            { name: 'id', type: 'string', required: true, description: '' },
          ],
        },
      ]
      const result = fmtFields(fields)
      expect(result).toContain('owner')
      expect(result).toContain('id')
    })

    it('should return empty string for empty array', () => {
      expect(fmtFields([])).toBe('')
    })
  })
})
