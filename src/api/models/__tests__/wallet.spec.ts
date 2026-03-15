import { describe, it, expect } from 'vitest'
import { Wallet, WalletShort, WalletTotal } from '../wallet'

const currencyRaw = {
    id: 'USD', code: 'USD', name: 'US Dollar', char: '$', rate: 1.0,
    updatedAt: '2024-01-01T00:00:00Z',
}

const walletShortRaw = {
    id: 10,
    name: 'My Wallet',
    slug: 'my-wallet',
    totalAmount: 1500.0,
    isActive: true,
    isPublic: false,
    isArchived: false,
    defaultCurrencyCode: 'USD',
    defaultCurrency: currencyRaw,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
}

const walletRaw = {
    ...walletShortRaw,
    users: [
        { id: 1, name: 'Alice', lastName: null, nickName: 'alice', photoUrl: null },
    ],
    latestCharges: [],
}

describe('WalletShort.from', () => {
    it('parses all fields', () => {
        const w = WalletShort.from(walletShortRaw)
        expect(w.id).toBe(10)
        expect(w.name).toBe('My Wallet')
        expect(w.slug).toBe('my-wallet')
        expect(w.totalAmount).toBe(1500.0)
        expect(w.isActive).toBe(true)
        expect(w.defaultCurrency?.code).toBe('USD')
        expect(w.createdAt).toBeInstanceOf(Date)
    })

    it('parses null defaultCurrency', () => {
        const w = WalletShort.from({ ...walletShortRaw, defaultCurrency: null, defaultCurrencyCode: null })
        expect(w.defaultCurrency).toBeNull()
        expect(w.defaultCurrencyCode).toBeNull()
    })

    it('throws on missing id', () => {
        expect(() => WalletShort.from({ ...walletShortRaw, id: undefined })).toThrow('"id"')
    })

    it('throws on non-object', () => {
        expect(() => WalletShort.from(null)).toThrow('expected object')
    })
})

describe('Wallet.from', () => {
    it('parses nested users and empty latestCharges', () => {
        const w = Wallet.from(walletRaw)
        expect(w.users).toHaveLength(1)
        expect(w.users[0].name).toBe('Alice')
        expect(w.latestCharges).toEqual([])
    })

    it('parses a charge inside latestCharges', () => {
        const chargeRaw = {
            id: 'a1b2-uuid',
            operation: '+',
            amount: 100,
            title: 'Salary',
            description: null,
            userId: 1,
            walletId: 10,
            dateTime: '2024-05-01T10:00:00Z',
            createdAt: '2024-05-01T10:00:00Z',
            updatedAt: '2024-05-01T10:00:00Z',
            user: null,
            tags: [],
            wallet: null,
        }
        const w = Wallet.from({ ...walletRaw, latestCharges: [chargeRaw] })
        expect(w.latestCharges).toHaveLength(1)
        expect(w.latestCharges[0].title).toBe('Salary')
        expect(w.latestCharges[0].dateTime).toBeInstanceOf(Date)
    })

    it('throws when id is missing', () => {
        expect(() => Wallet.from({ ...walletRaw, id: undefined })).toThrow('"id"')
    })

    it('throws on non-object', () => {
        expect(() => Wallet.from(null)).toThrow('expected object')
    })
})

describe('WalletTotal.from', () => {
    it('parses totals and tags', () => {
        const t = WalletTotal.from({
            totalAmount: 500,
            totalIncomeAmount: 1000,
            totalExpenseAmount: 500,
            tags: [{ tagId: 1, totalIncomeAmount: 200, totalExpenseAmount: 100 }],
        })
        expect(t.totalAmount).toBe(500)
        expect(t.tags).toHaveLength(1)
        expect(t.tags[0].tagId).toBe(1)
    })

    it('defaults missing numeric fields to 0', () => {
        const t = WalletTotal.from({})
        expect(t.totalAmount).toBe(0)
        expect(t.tags).toEqual([])
    })

    it('skips malformed (non-object) entries in tags array', () => {
        const t = WalletTotal.from({ totalAmount: 0, totalIncomeAmount: 0, totalExpenseAmount: 0, tags: [null, 'bad', 42] })
        expect(t.tags).toEqual([])
    })

    it('throws on non-object', () => {
        expect(() => WalletTotal.from(null)).toThrow('expected object')
    })
})
