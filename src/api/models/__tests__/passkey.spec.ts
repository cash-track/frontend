import { describe, it, expect } from 'vitest'
import { Passkey } from '../passkey'

describe('Passkey.from', () => {
    it('parses all fields with usedAt', () => {
        const p = Passkey.from({
            id: 7,
            name: 'iPhone 15',
            createdAt: '2024-03-01T00:00:00Z',
            usedAt: '2024-06-01T12:00:00Z',
        })
        expect(p.id).toBe(7)
        expect(p.name).toBe('iPhone 15')
        expect(p.createdAt).toBeInstanceOf(Date)
        expect(p.usedAt).toBeInstanceOf(Date)
    })

    it('parses null usedAt (never used)', () => {
        const p = Passkey.from({
            id: 7,
            name: 'iPhone 15',
            createdAt: '2024-03-01T00:00:00Z',
            usedAt: null,
        })
        expect(p.usedAt).toBeNull()
    })

    it('parses missing usedAt as null', () => {
        const p = Passkey.from({ id: 7, name: 'Key', createdAt: '2024-03-01T00:00:00Z' })
        expect(p.usedAt).toBeNull()
    })

    it('throws on missing name', () => {
        expect(() => Passkey.from({ id: 7, createdAt: '2024-01-01T00:00:00Z' })).toThrow('"name"')
    })
})
