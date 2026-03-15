import { describe, it, expect } from 'vitest'
import { Currency } from '../currency'

const validRaw = {
    id: 'USD',
    code: 'USD',
    name: 'US Dollar',
    char: '$',
    rate: 1.0,
    updatedAt: '2024-01-01T00:00:00Z',
}

describe('Currency.from', () => {
    it('parses all fields', () => {
        const c = Currency.from(validRaw)
        expect(c.id).toBe('USD')
        expect(c.code).toBe('USD')
        expect(c.name).toBe('US Dollar')
        expect(c.char).toBe('$')
        expect(c.rate).toBe(1.0)
        expect(c.updatedAt).toBeInstanceOf(Date)
    })

    it('throws on missing required field', () => {
        expect(() => Currency.from({ ...validRaw, code: undefined })).toThrow('"code"')
    })

    it('throws on non-object', () => {
        expect(() => Currency.from(null)).toThrow('expected object')
    })
})
