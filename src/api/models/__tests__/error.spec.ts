import { describe, it, expect } from 'vitest'
import { ApiError, ValidationError } from '../error'

describe('ApiError.from', () => {
    it('parses message and error code', () => {
        const e = ApiError.from({ message: 'Not found', error: 'NOT_FOUND' })
        expect(e.message).toBe('Not found')
        expect(e.error).toBe('NOT_FOUND')
    })

    it('sets error to null when absent', () => {
        const e = ApiError.from({ message: 'Oops' })
        expect(e.error).toBeNull()
    })

    it('uses fallback message when message is missing', () => {
        const e = ApiError.from({})
        expect(e.message).toBe('Unknown error')
    })

    it('throws on non-object', () => {
        expect(() => ApiError.from(null)).toThrow('expected object')
    })
})

describe('ValidationError.from', () => {
    it('parses field errors', () => {
        const e = ValidationError.from({
            errors: {
                email: ['Must be valid email'],
                password: ['Too short', 'Must contain uppercase'],
            },
        })
        expect(e.errors.email).toEqual(['Must be valid email'])
        expect(e.errors.password).toHaveLength(2)
    })

    it('getFieldError returns first error', () => {
        const e = ValidationError.from({ errors: { name: ['Required'] } })
        expect(e.getFieldError('name')).toBe('Required')
    })

    it('getFieldError returns null for unknown field', () => {
        const e = ValidationError.from({ errors: {} })
        expect(e.getFieldError('missing')).toBeNull()
    })

    it('normalizes string field errors to single-element arrays (Spiral format)', () => {
        const e = ValidationError.from({ errors: { name: 'Value should be unique.' } })
        expect(e.errors.name).toEqual(['Value should be unique.'])
        expect(e.getFieldError('name')).toBe('Value should be unique.')
    })

    it('filters out non-string values within an error array', () => {
        const e = ValidationError.from({ errors: { email: ['Required', 42, null] } })
        expect(e.errors.email).toEqual(['Required'])
    })

    it('throws when errors field is not an object', () => {
        expect(() => ValidationError.from({ errors: 'bad' })).toThrow('missing errors field')
    })

    it('throws on missing errors field', () => {
        expect(() => ValidationError.from({})).toThrow('missing errors field')
    })
})
