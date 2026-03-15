import { describe, it, expect } from 'vitest'
import {
    requireString,
    requireNumber,
    requireBoolean,
    requireDate,
    optionalString,
    optionalDate,
    optionalNumber,
} from '../_validators'

describe('requireString', () => {
    it('returns the string value', () => {
        expect(requireString({ name: 'Alice' }, 'name')).toBe('Alice')
    })

    it('throws on missing key', () => {
        expect(() => requireString({}, 'name')).toThrow('"name"')
    })

    it('throws on non-string value', () => {
        expect(() => requireString({ name: 42 }, 'name')).toThrow('"name"')
    })
})

describe('requireNumber', () => {
    it('returns the number value', () => {
        expect(requireNumber({ amount: 99.5 }, 'amount')).toBe(99.5)
    })

    it('throws on missing key', () => {
        expect(() => requireNumber({}, 'amount')).toThrow('"amount"')
    })
})

describe('requireBoolean', () => {
    it('returns true', () => {
        expect(requireBoolean({ active: true }, 'active')).toBe(true)
    })

    it('throws on string', () => {
        expect(() => requireBoolean({ active: 'yes' }, 'active')).toThrow('"active"')
    })
})

describe('requireDate', () => {
    it('parses ISO string to Date', () => {
        const d = requireDate({ createdAt: '2024-01-15T12:00:00Z' }, 'createdAt')
        expect(d).toBeInstanceOf(Date)
        expect(d.getFullYear()).toBe(2024)
    })

    it('throws on invalid date string', () => {
        expect(() => requireDate({ createdAt: 'not-a-date' }, 'createdAt')).toThrow('"createdAt"')
    })

    it('throws on missing key', () => {
        expect(() => requireDate({}, 'createdAt')).toThrow('"createdAt"')
    })
})

describe('optionalString', () => {
    it('returns null for null', () => {
        expect(optionalString({ x: null }, 'x')).toBeNull()
    })

    it('returns null for undefined key', () => {
        expect(optionalString({}, 'x')).toBeNull()
    })

    it('returns the string', () => {
        expect(optionalString({ x: 'hello' }, 'x')).toBe('hello')
    })

    it('throws on non-string non-null value', () => {
        expect(() => optionalString({ x: 42 }, 'x')).toThrow('"x"')
    })
})

describe('optionalDate', () => {
    it('returns null for null', () => {
        expect(optionalDate({ usedAt: null }, 'usedAt')).toBeNull()
    })

    it('returns null for undefined key', () => {
        expect(optionalDate({}, 'usedAt')).toBeNull()
    })

    it('parses ISO string', () => {
        const d = optionalDate({ usedAt: '2024-06-01T00:00:00Z' }, 'usedAt')
        expect(d).toBeInstanceOf(Date)
    })
})

describe('optionalNumber', () => {
    it('returns null for null', () => {
        expect(optionalNumber({ rate: null }, 'rate')).toBeNull()
    })

    it('returns the number', () => {
        expect(optionalNumber({ rate: 1.5 }, 'rate')).toBe(1.5)
    })
})
