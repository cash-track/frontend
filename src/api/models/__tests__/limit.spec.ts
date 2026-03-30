import { describe, it, expect } from 'vitest'
import { Limit, WalletLimit } from '../limit'

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

const limitRaw = {
    id: 5,
    operation: '-',
    amount: 500,
    walletId: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    tags: [tagRaw],
    wallet: walletShortRaw,
}

describe('Limit.from', () => {
    it('parses all fields', () => {
        const l = Limit.from(limitRaw)
        expect(l.id).toBe(5)
        expect(l.operation).toBe('-')
        expect(l.amount).toBe(500)
        expect(l.tags).toHaveLength(1)
        expect(l.wallet?.id).toBe(10)
        expect(l.createdAt).toBeInstanceOf(Date)
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
