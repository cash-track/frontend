import { describe, it, expect } from 'vitest'
import { Pagination } from '../pagination'

const validRaw = {
    page: 1,
    limit: 20,
    total: 45,
    totalPages: 3,
    hasNext: true,
    hasPrev: false,
}

describe('Pagination.from', () => {
    it('parses all fields correctly', () => {
        const p = Pagination.from(validRaw)
        expect(p.page).toBe(1)
        expect(p.limit).toBe(20)
        expect(p.total).toBe(45)
        expect(p.totalPages).toBe(3)
        expect(p.hasNext).toBe(true)
        expect(p.hasPrev).toBe(false)
    })

    it('parses hasPrev: true', () => {
        const p = Pagination.from({ ...validRaw, page: 2, hasPrev: true })
        expect(p.hasPrev).toBe(true)
    })

    it('defaults hasNext/hasPrev to false when absent', () => {
        const raw = { page: 1, limit: 10, total: 5, totalPages: 1 }
        const p = Pagination.from(raw)
        expect(p.hasNext).toBe(false)
        expect(p.hasPrev).toBe(false)
    })

    it('throws on missing required field', () => {
        expect(() => Pagination.from({ page: 1, limit: 10, total: 5 })).toThrow('"totalPages"')
    })

    it('throws on non-object input', () => {
        expect(() => Pagination.from(null)).toThrow('expected object')
        expect(() => Pagination.from('bad')).toThrow('expected object')
    })
})
