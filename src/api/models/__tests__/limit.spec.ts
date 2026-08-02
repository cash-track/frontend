import { describe, it, expect } from 'vitest'
import { Limit, LimitTagGroup, WalletLimit } from '../limit'

const walletShortRaw = {
    id: 10, name: 'My Wallet', slug: 'my-wallet', totalAmount: 1500,
    isActive: true, isPublic: false, isArchived: false,
    defaultCurrencyCode: null, defaultCurrency: null,
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
}

const tagRaw = {
    id: 1, name: 'food', icon: null, color: null,
    userId: 1, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
}

const tagRaw2 = {
    id: 2, name: 'fuel', icon: null, color: null,
    userId: 1, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
}

const tagGroupRaw = { connection: 'or', tags: [tagRaw] }

const limitRaw = {
    id: 5,
    operation: '-',
    amount: 500,
    walletId: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    tagGroups: [tagGroupRaw],
    wallet: walletShortRaw,
}

describe('LimitTagGroup.from', () => {
    it('parses connection and tags', () => {
        const g = LimitTagGroup.from({ connection: 'and', tags: [tagRaw, tagRaw2] })
        expect(g.connection).toBe('and')
        expect(g.tags).toHaveLength(2)
        expect(g.tags[0]).toEqual(expect.objectContaining({ id: 1 }))
    })

    it('parses or connection with a single tag', () => {
        const g = LimitTagGroup.from(tagGroupRaw)
        expect(g.connection).toBe('or')
        expect(g.tags).toHaveLength(1)
    })

    it('defaults tags to empty array when missing', () => {
        const g = LimitTagGroup.from({ connection: 'or' })
        expect(g.tags).toEqual([])
    })

    it('throws on invalid connection', () => {
        expect(() => LimitTagGroup.from({ connection: 'xor', tags: [] })).toThrow('invalid connection')
    })

    it('throws on non-object', () => {
        expect(() => LimitTagGroup.from(null)).toThrow('expected object')
    })
})

describe('Limit.from', () => {
    it('parses all fields', () => {
        const l = Limit.from(limitRaw)
        expect(l.id).toBe(5)
        expect(l.operation).toBe('-')
        expect(l.amount).toBe(500)
        expect(l.tagGroups).toHaveLength(1)
        expect(l.tagGroups[0]).toBeInstanceOf(LimitTagGroup)
        expect(l.tagGroups[0].connection).toBe('or')
        expect(l.tagGroups[0].tags).toHaveLength(1)
        expect(l.wallet?.id).toBe(10)
        expect(l.createdAt).toBeInstanceOf(Date)
    })

    it('parses multiple tag groups with mixed connections', () => {
        const l = Limit.from({
            ...limitRaw,
            tagGroups: [{ connection: 'or', tags: [tagRaw] }, { connection: 'and', tags: [tagRaw2, tagRaw] }],
        })
        expect(l.tagGroups).toHaveLength(2)
        expect(l.tagGroups[1].connection).toBe('and')
        expect(l.tagGroups[1].tags).toHaveLength(2)
    })

    it('defaults tagGroups to empty array when missing', () => {
        const l = Limit.from({ ...limitRaw, tagGroups: undefined })
        expect(l.tagGroups).toEqual([])
    })

    it('parses + operation', () => {
        const l = Limit.from({ ...limitRaw, operation: '+' })
        expect(l.operation).toBe('+')
    })

    it('parses null wallet', () => {
        const l = Limit.from({ ...limitRaw, wallet: null })
        expect(l.wallet).toBeNull()
    })

    it('throws on invalid operation', () => {
        expect(() => Limit.from({ ...limitRaw, operation: '*' })).toThrow('invalid operation')
    })

    it('throws on non-object', () => {
        expect(() => Limit.from(null)).toThrow('expected object')
    })
})

describe('WalletLimit.from', () => {
    it('parses amount, percentage and nested limit', () => {
        const wl = WalletLimit.from({ amount: 350, percentage: 70, limit: limitRaw })
        expect(wl.amount).toBe(350)
        expect(wl.percentage).toBe(70)
        expect(wl.isExceeded).toBe(false)
        expect(wl.limit.id).toBe(5)
    })

    it('isExceeded is true when percentage > 100', () => {
        const wl = WalletLimit.from({ amount: 600, percentage: 120, limit: limitRaw })
        expect(wl.isExceeded).toBe(true)
    })

    it('isExceeded is false at exactly 100', () => {
        const wl = WalletLimit.from({ amount: 500, percentage: 100, limit: limitRaw })
        expect(wl.isExceeded).toBe(false)
    })

    it('throws on non-object', () => {
        expect(() => WalletLimit.from(null)).toThrow('expected object')
    })
})
